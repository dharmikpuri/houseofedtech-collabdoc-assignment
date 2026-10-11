import { log } from "@/lib/observability/logger";

/**
 * Transactional email.
 *
 * Sends through Resend's REST API when RESEND_API_KEY and EMAIL_FROM are set
 * (no SDK: it's one POST). Without them:
 *  - in development the message is written to the server log, so flows like
 *    password reset can be exercised locally with no email account;
 *  - in production nothing is logged (a reset link is a secret) and the caller
 *    is told email is unavailable, so the UI can hide features that need it.
 */

export type EmailResult = "sent" | "logged" | "unavailable";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Whether flows that depend on email should be offered at all. */
export function isEmailAvailable(): boolean {
  return isEmailConfigured() || process.env.NODE_ENV !== "production";
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      log.warn("Email is not configured — logging the message instead of sending it", {
        to: message.to,
        subject: message.subject,
        body: message.text,
      });
      return "logged";
    }
    return "unavailable";
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Email provider responded ${res.status}`);
  return "sent";
}
