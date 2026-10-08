import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { AuthForm } from "../auth-form";
import { safeRedirectPath } from "@/lib/security/redirect";
import { isEmailConfigured } from "@/lib/email/send";

export const metadata: Metadata = { title: "Sign in" };

/**
 * One-click demo sign-in for reviewers. It publishes the demo password on the
 * page, so it is shown only when explicitly enabled with SHOW_DEMO_LOGIN=true
 * (and only for the dedicated demo account seeded by scripts/seed-demo.mjs).
 */
function demoCredentials(): { email: string; password: string } | undefined {
  if (process.env.SHOW_DEMO_LOGIN !== "true" || !process.env.DEMO_PASSWORD) return undefined;
  return {
    email: process.env.DEMO_EMAIL ?? "demo@collabdoc.dev",
    password: process.env.DEMO_PASSWORD,
  };
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; reset?: string }>;
}) {
  const { callbackUrl, reset } = await searchParams;
  // Only forward a destination that is already a safe same-site path.
  const destination = callbackUrl ? safeRedirectPath(callbackUrl) : undefined;

  return (
    <div>
      <h1 className="font-display text-[1.75rem] leading-tight">Welcome back</h1>
      <p className="text-muted-foreground mt-1.5 mb-8 text-sm">
        Sign in to pick up where you left off — online or not.
      </p>
      {reset === "1" && (
        <p
          role="status"
          className="border-success/30 bg-success-subtle text-success mb-5 flex items-center gap-2 rounded-lg border p-3 text-xs"
        >
          <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
          Your password was updated. Sign in with your new password.
        </p>
      )}
      <AuthForm
        mode="sign-in"
        callbackUrl={destination}
        showForgotPassword={isEmailConfigured()}
        demo={demoCredentials()}
      />
    </div>
  );
}
