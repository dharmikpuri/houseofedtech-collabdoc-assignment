"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { changePasswordAction, updateProfileAction, type SettingsState } from "./actions";

function Feedback({ state }: { state: SettingsState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-danger flex items-center gap-1.5 text-xs">
        <AlertCircle className="size-3.5 shrink-0" aria-hidden />
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="text-success flex items-center gap-1.5 text-xs">
        <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
        {state.success}
      </p>
    );
  }
  return null;
}

export function ProfileForm({ initialName }: { initialName: string }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateProfileAction,
    {},
  );
  const [name, setName] = useState(initialName);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          autoComplete="name"
          required
        />
      </div>
      <div className="border-border flex items-center justify-between gap-3 border-t pt-4">
        <Feedback state={state} />
        <Button
          type="submit"
          loading={pending}
          disabled={!name.trim() || name.trim() === initialName}
          className="ml-auto"
        >
          Save
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    changePasswordAction,
    {},
  );
  const [password, setPassword] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Clear every field after a successful change, so passwords don't linger.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-4 space-y-4"
      onReset={() => setPassword("")}
    >
      <div>
        <Label htmlFor="current">Current password</Label>
        <PasswordInput id="current" name="current" autoComplete="current-password" required />
      </div>
      <div>
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput
          id="new-password"
          name="password"
          autoComplete="new-password"
          required
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordStrength password={password} />
      </div>
      <div>
        <Label htmlFor="confirm">Confirm new password</Label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
      </div>
      <div className="border-border flex items-center justify-between gap-3 border-t pt-4">
        <Feedback state={state} />
        <Button type="submit" loading={pending} className="ml-auto">
          Change password
        </Button>
      </div>
    </form>
  );
}
