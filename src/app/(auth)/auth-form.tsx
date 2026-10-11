"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { AlertCircle, ArrowRight, PlayCircle } from "lucide-react";

import { PasswordStrength } from "@/components/auth/password-strength";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { signInAction, signUpAction, type AuthActionState } from "./actions";
import { ROUTES } from "@/config/routes";
import { SITE } from "@/config/site";

type Mode = "sign-in" | "sign-up";

/**
 * Shared credentials form for both sign-in and sign-up. `useActionState` wires
 * the form to its server action and exposes `isPending` for the submit state,
 * so we don't manage loading flags by hand.
 */
export function AuthForm({
  mode,
  callbackUrl,
  showForgotPassword = false,
  demo,
}: {
  mode: Mode;
  callbackUrl?: string;
  showForgotPassword?: boolean;
  /** Offered only when the deployment explicitly enables a public demo account. */
  demo?: { email: string; password: string };
}) {
  const isSignUp = mode === "sign-up";
  const action = isSignUp ? signUpAction : signInAction;
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(action, {});
  const [password, setPassword] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  function signInWithDemo() {
    if (!demo || !emailRef.current) return;
    emailRef.current.value = demo.email;
    setPassword(demo.password);
    // Submit after React has applied the password value.
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  // Carry the destination across the sign-in ↔ sign-up switch too.
  const carry = callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : "";

  return (
    <form ref={formRef} action={formAction} className="space-y-5" noValidate>
      {demo && !isSignUp && (
        <>
          <button
            type="button"
            onClick={signInWithDemo}
            disabled={isPending}
            className="border-border bg-surface hover:border-border-strong hover:bg-subtle group flex w-full items-center gap-3 rounded-xl border p-3 text-left shadow-xs transition-colors disabled:opacity-60"
          >
            <span className="bg-primary-subtle text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <PlayCircle className="size-4.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Explore the demo workspace</span>
              <span className="text-muted-foreground block text-xs">
                Sample documents, comments and version history
              </span>
            </span>
            <ArrowRight
              className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>

          <div className="flex items-center gap-3" aria-hidden>
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              or with email
            </span>
            <span className="bg-border h-px flex-1" />
          </div>
        </>
      )}

      {/* Sanitised again on the server; this is only a hint. */}
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

      {isSignUp && (
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            className="h-10"
            required
          />
        </div>
      )}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          className="h-10"
          aria-invalid={Boolean(state?.error)}
          required
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password">Password</Label>
          {showForgotPassword && (
            <Link
              href={ROUTES.forgotPassword}
              className="text-muted-foreground hover:text-foreground mb-1.5 text-xs transition-colors hover:underline"
            >
              Forgot password?
            </Link>
          )}
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          placeholder={isSignUp ? "At least 8 characters" : "••••••••"}
          minLength={isSignUp ? 8 : undefined}
          className="h-10"
          aria-invalid={Boolean(state?.error)}
          aria-describedby={isSignUp ? "password-hint" : undefined}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {isSignUp && (
          <>
            <p id="password-hint" className="text-muted-foreground mt-1.5 text-xs">
              At least 8 characters, with a letter and a number.
            </p>
            <PasswordStrength password={password} />
          </>
        )}
      </div>

      {state?.error && (
        <p
          role="alert"
          className="border-danger/30 bg-danger-subtle text-danger flex items-start gap-2 rounded-lg border p-3 text-xs"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <Button type="submit" loading={isPending} size="lg" className="w-full">
        {isSignUp ? "Create account" : "Sign in"}
        {!isPending && <ArrowRight />}
      </Button>

      {isSignUp && (
        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          Your documents are stored on this device first and synced securely when you&apos;re
          online.
        </p>
      )}

      <p className="text-muted-foreground border-border border-t pt-5 text-center text-sm">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link
              href={`${ROUTES.signIn}${carry}`}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to {SITE.name}?{" "}
            <Link
              href={`${ROUTES.signUp}${carry}`}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
