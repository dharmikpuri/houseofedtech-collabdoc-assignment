"use client";

import { useActionState } from "react";
import { AlertCircle, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction, type ForgotState } from "../password-actions";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(
    forgotPasswordAction,
    {},
  );

  if (state.sent) {
    return (
      <div
        role="status"
        className="border-border bg-surface flex items-start gap-3 rounded-xl border p-4 shadow-xs"
      >
        <span className="bg-success-subtle text-success flex size-9 shrink-0 items-center justify-center rounded-lg">
          <MailCheck className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-medium">Check your inbox</p>
          <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
            If an account exists for that email, a reset link is on its way. It expires in 1 hour.
            Check your spam folder if it doesn&apos;t arrive.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          className="h-10"
          required
          aria-invalid={Boolean(state.error)}
        />
      </div>
      {state.error && (
        <p
          role="alert"
          className="border-danger/30 bg-danger-subtle text-danger flex items-start gap-2 rounded-lg border p-3 text-xs"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} className="w-full">
        Send reset link
      </Button>
    </form>
  );
}
