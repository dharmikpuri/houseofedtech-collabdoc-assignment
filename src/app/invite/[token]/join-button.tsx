"use client";

import { useActionState } from "react";
import { AlertCircle, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { acceptInviteAction, type AcceptInviteState } from "./actions";

export function JoinButton({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AcceptInviteState, FormData>(
    acceptInviteAction.bind(null, token),
    {},
  );

  return (
    <form action={formAction} className="mt-5">
      {state.error && (
        <p
          role="alert"
          className="border-danger/30 bg-danger-subtle text-danger mb-3 flex items-start gap-2 rounded-md border p-2.5 text-xs"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}
      <Button type="submit" loading={pending} className="w-full">
        {!pending && <UserPlus />}
        Join document
      </Button>
    </form>
  );
}
