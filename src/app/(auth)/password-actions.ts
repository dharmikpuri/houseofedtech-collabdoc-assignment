"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requestPasswordReset, resetPassword } from "@/lib/auth/password-reset";
import { isEmailAvailable } from "@/lib/email/send";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { ROUTES } from "@/config/routes";

export type ForgotState = { error?: string; sent?: boolean };
export type ResetState = { error?: string };

/**
 * Starts a password reset. Always answers the same way — whether or not the
 * email belongs to an account, and without waiting for the email to be sent —
 * so neither the message nor the response time reveals who has an account.
 */
export async function forgotPasswordAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  if (!isEmailAvailable()) {
    return { error: "Password reset isn't available on this deployment." };
  }

  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid email" };

  const ip = clientIp(await headers());
  const email = parsed.data.email.trim().toLowerCase();
  // Per-IP and per-address limits: stops both scripted abuse and someone
  // flooding one person's inbox.
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`reset-ip:${ip}`, 5, 60_000),
    rateLimit(`reset-email:${email}`, 3, 60 * 60_000),
  ]);
  if (!byIp.ok) return { error: "Too many attempts. Please wait a minute and try again." };

  // Silently skip (but still report success) when this address is throttled.
  if (byEmail.ok) {
    after(async () => {
      await requestPasswordReset(email);
    });
  }
  return { sent: true };
}

export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const ip = clientIp(await headers());
  if (!(await rateLimit(`reset-submit:${ip}`, 10, 60_000)).ok) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const result = await resetPassword(parsed.data.token, parsed.data.password);
  if (!result.ok) {
    return {
      error:
        result.reason === "expired"
          ? "This reset link has expired. Request a new one."
          : result.reason === "used"
            ? "This reset link has already been used. Request a new one if you need to."
            : "This reset link is not valid.",
    };
  }

  redirect(`${ROUTES.signIn}?reset=1`);
}
