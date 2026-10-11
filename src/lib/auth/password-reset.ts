import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { log } from "@/lib/observability/logger";
import { SITE } from "@/config/site";

/**
 * Password reset.
 *
 * Security properties:
 *  - No account enumeration: the request path always reports the same outcome
 *    whether or not the email exists.
 *  - The token is 256 bits from the CSPRNG; only its SHA-256 is stored.
 *  - Tokens expire after an hour, are single-use (claimed atomically, so two
 *    concurrent submissions can't both succeed), and requesting a new one
 *    invalidates any older ones.
 *  - The link's origin comes from configuration (NEXT_PUBLIC_APP_URL), never
 *    from the request's Host header — otherwise a spoofed Host could make us
 *    email a victim a link to an attacker's site ("host header poisoning").
 */

const TOKEN_TTL_MS = 60 * 60 * 1000;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function appOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return null;
    }
  }
  return process.env.NODE_ENV === "production" ? null : "http://localhost:3000";
}

export async function requestPasswordReset(email: string): Promise<void> {
  const origin = appOrigin();
  if (!origin) {
    log.error("Password reset requested but NEXT_PUBLIC_APP_URL is not set");
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: { id: true, name: true, email: true },
  });
  // Same observable behaviour for unknown emails: return quietly.
  if (!user) return;

  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hash(token),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    }),
  ]);

  const link = `${origin}/reset-password/${token}`;
  const greeting = user.name ? `Hi ${user.name},` : "Hi,";
  try {
    await sendEmail({
      to: user.email,
      subject: `Reset your ${SITE.name} password`,
      text: `${greeting}\n\nUse this link to choose a new password. It expires in 1 hour and works once:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email — your password won't change.`,
      html: `<p>${escapeHtml(greeting)}</p><p>Use the button below to choose a new password. The link expires in 1 hour and works once.</p><p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none">Reset password</a></p><p style="color:#71717a;font-size:13px">If you didn't ask for this, you can ignore this email — your password won't change.</p>`,
    });
  } catch (error) {
    // Don't reveal delivery failures to the requester (that would confirm the
    // account exists); record them for operators instead.
    log.error("Password reset email failed", { error });
  }
}

export type ResetTokenStatus = "valid" | "invalid" | "expired" | "used";

export async function checkResetToken(token: string): Promise<ResetTokenStatus> {
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hash(token) },
    select: { expiresAt: true, usedAt: true },
  });
  if (!row) return "invalid";
  if (row.usedAt) return "used";
  if (row.expiresAt <= new Date()) return "expired";
  return "valid";
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: Exclude<ResetTokenStatus, "valid"> }> {
  const tokenHash = hash(token);
  const passwordHash = await bcrypt.hash(newPassword, 12);

  return prisma.$transaction(
    async (tx) => {
      // Claim the token atomically: only one request can flip usedAt from null.
      const claimed = await tx.passwordResetToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });

      if (claimed.count === 0) {
        const row = await tx.passwordResetToken.findUnique({
          where: { tokenHash },
          select: { usedAt: true, expiresAt: true },
        });
        if (!row) return { ok: false, reason: "invalid" } as const;
        return { ok: false, reason: row.usedAt ? "used" : "expired" } as const;
      }

      const row = await tx.passwordResetToken.findUniqueOrThrow({
        where: { tokenHash },
        select: { userId: true },
      });
      await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
      // Any other outstanding links for this account are now pointless.
      await tx.passwordResetToken.deleteMany({ where: { userId: row.userId, usedAt: null } });
      return { ok: true } as const;
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
}
