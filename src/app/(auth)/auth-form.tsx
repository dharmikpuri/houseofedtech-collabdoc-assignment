"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, signUpAction, type AuthActionState } from "./actions";

type Mode = "sign-in" | "sign-up";

/**
 * Shared credentials form for both sign-in and sign-up. `useActionState` wires
 * the form to its server action and exposes `isPending` for the submit state,
 * so we don't manage loading flags by hand.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const isSignUp = mode === "sign-up";
  const action = isSignUp ? signUpAction : signInAction;
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {isSignUp && (
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
      )}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          minLength={isSignUp ? 8 : undefined}
          required
        />
        {isSignUp && <p className="text-muted-foreground mt-1 text-xs">At least 8 characters.</p>}
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="text-foreground font-medium hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-foreground font-medium hover:underline">
              Create one
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
