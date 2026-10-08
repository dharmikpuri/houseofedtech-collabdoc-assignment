import type { Metadata } from "next";
import Link from "next/link";
import { Link2Off, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";

import { checkResetToken } from "@/lib/auth/password-reset";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

const MESSAGES = {
  invalid: "This reset link isn't valid.",
  expired: "This reset link has expired.",
  used: "This reset link has already been used.",
} as const;

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const status = /^[A-Za-z0-9_-]{43}$/.test(token) ? await checkResetToken(token) : "invalid";

  if (status !== "valid") {
    return (
      <div>
        <span className="bg-danger-subtle text-danger flex size-11 items-center justify-center rounded-xl">
          <Link2Off className="size-5" aria-hidden />
        </span>
        <h1 className="font-display mt-6 text-[1.75rem] leading-tight">{MESSAGES[status]}</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Reset links expire after an hour and work only once.
        </p>
        <Button asChild size="lg" className="mt-8 w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <span className="border-border bg-surface flex size-11 items-center justify-center rounded-xl border shadow-xs">
        <LockKeyhole className="size-5" aria-hidden />
      </span>
      <h1 className="font-display mt-6 text-[1.75rem] leading-tight">Choose a new password</h1>
      <p className="text-muted-foreground mt-1.5 mb-8 text-sm">
        At least 8 characters, with a letter and a number.
      </p>
      <ResetPasswordForm token={token} />
    </div>
  );
}
