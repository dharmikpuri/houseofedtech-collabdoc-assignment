"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { headers } from "next/headers";

import { signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { safeRedirectPath } from "@/lib/security/redirect";

export type AuthActionState = { error?: string };

async function authRateLimit(bucket: string, limit: number): Promise<boolean> {
  const ip = clientIp(await headers());
  return (await rateLimit(`${bucket}:${ip}`, limit, 60_000)).ok;
}

/**
 * Create an account, then sign the user straight in.
 *
 * On a successful `signIn` with `redirectTo`, Auth.js throws a Next.js redirect
 * — we must let that propagate, so we only swallow `AuthError`.
 */
export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!(await authRateLimit("sign-up", 5))) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { name, email, passwordHash } });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: safeRedirectPath(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Please sign in manually." };
    }
    throw error;
  }

  return {};
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!(await authRateLimit("sign-in", 10))) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password } = parsed.data;

  try {
    await signIn("credentials", {
      email,
      password,
      // Where the user was heading before being asked to sign in (e.g. an
      // invite link). Sanitised to a same-site path — never an open redirect.
      redirectTo: safeRedirectPath(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }

  return {};
}
