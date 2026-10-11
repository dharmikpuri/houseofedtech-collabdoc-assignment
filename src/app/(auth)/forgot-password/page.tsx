import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, KeyRound } from "lucide-react";

import { isEmailConfigured } from "@/lib/email/send";
import { ForgotPasswordForm } from "./forgot-password-form";
import { ROUTES } from "@/config/routes";

export const metadata: Metadata = { title: "Reset password" };

// Reads environment configuration at request time, not at build time.
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  // Password reset needs a real email provider. Until one is configured the
  // feature simply isn't offered: the sign-in page hides its link, and this
  // route sends anyone who lands here back to sign-in.
  if (!isEmailConfigured()) redirect(ROUTES.signIn);

  return (
    <div>
      <span className="bg-primary-subtle text-primary flex size-11 items-center justify-center rounded-xl">
        <KeyRound className="size-5" aria-hidden />
      </span>
      <h1 className="page-title mt-6">Forgot your password?</h1>
      <p className="text-muted-foreground mt-1.5 mb-8 text-sm">
        Enter your account&apos;s email and we&apos;ll send you a link to choose a new one.
      </p>
      <ForgotPasswordForm />
      <Link
        href={ROUTES.signIn}
        className="text-muted-foreground hover:text-foreground mt-8 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to sign in
      </Link>
    </div>
  );
}
