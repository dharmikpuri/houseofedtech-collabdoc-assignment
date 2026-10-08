"use client";

import { useActionState, useState } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { resetPasswordAction, type ResetState } from "../../password-actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    resetPasswordAction,
    {},
  );
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <div>
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="h-10"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordStrength password={password} />
      </div>
      <div>
        <Label htmlFor="confirm">Confirm new password</Label>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          className="h-10"
          required
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
        Update password
      </Button>
    </form>
  );
}
