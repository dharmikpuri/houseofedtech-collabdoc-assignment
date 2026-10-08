"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth, updateSession } from "@/auth";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { changePasswordSchema, profileSchema } from "@/lib/validation/auth";

export type SettingsState = { error?: string; success?: string };

/**
 * Account settings actions. Each re-checks the session itself (server actions
 * are public endpoints) and only ever touches the signed-in user's own row.
 */

export async function updateProfileAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name" };

  await prisma.user.update({ where: { id: session.user.id }, data: { name: parsed.data.name } });
  // Refresh the name held in the session cookie, then re-render the shell.
  await updateSession({ user: { name: parsed.data.name } });
  revalidatePath("/", "layout");
  return { success: "Profile updated." };
}

export async function changePasswordAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  // Throttle by user and IP: current-password checks are a guessing oracle.
  const ip = clientIp(await headers());
  const [byUser, byIp] = await Promise.all([
    rateLimit(`pw-change:${session.user.id}`, 5, 15 * 60_000),
    rateLimit(`pw-change-ip:${ip}`, 10, 60_000),
  ]);
  if (!byUser.ok || !byIp.ok) return { error: "Too many attempts. Please wait a few minutes." };

  const parsed = changePasswordSchema.safeParse({
    current: formData.get("current"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user || !(await bcrypt.compare(parsed.data.current, user.passwordHash))) {
    return { error: "Your current password is incorrect." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) },
  });
  // A password change makes any outstanding reset links pointless.
  await prisma.passwordResetToken.deleteMany({ where: { userId: session.user.id, usedAt: null } });

  return { success: "Password changed." };
}
