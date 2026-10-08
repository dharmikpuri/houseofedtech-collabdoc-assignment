"use client";

import { AlertCircle, Clock, RotateCw, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { discardMutation, retryMutation } from "@/lib/outbox/outbox";
import { describeMutation, type Mutation } from "@/lib/outbox/types";
import { confirmToast } from "@/components/ui/confirm-toast";

/**
 * The visible sync queue: every action waiting to reach the server, with a way
 * out for the ones that can't. Nothing the user did is ever dropped silently —
 * a permanently rejected action stays here until they retry or discard it.
 */
export function OutboxList({
  items,
  authPaused,
  emptyText = "Nothing waiting to sync.",
  className,
}: {
  items: readonly Mutation[];
  authPaused: boolean;
  emptyText?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return <p className={cn("text-muted-foreground text-xs", className)}>{emptyText}</p>;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {authPaused && (
        <p className="border-warning/30 bg-warning-subtle text-warning flex items-start gap-1.5 rounded-md border p-2 text-[11px] leading-relaxed">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          Your session expired. Sign in again to sync these changes — they&apos;re kept safely on
          this device until then.
        </p>
      )}

      <ul className="space-y-1.5">
        {items.map((mutation) => (
          <OutboxRow key={mutation.id} mutation={mutation} />
        ))}
      </ul>
    </div>
  );
}

function OutboxRow({ mutation }: { mutation: Mutation }) {
  const failed = mutation.status === "failed";
  const label = describeMutation(mutation);

  async function handleDiscard() {
    const confirmed = await confirmToast(
      `Discard “${label}”? This change was never saved to the server and will be lost.`,
      "Discard",
    );
    if (confirmed) await discardMutation(mutation.id);
  }

  return (
    <li
      className={cn(
        "rounded-md border px-2 py-1.5 text-[11px]",
        failed ? "border-danger/30 bg-danger-subtle" : "border-border bg-muted/40",
      )}
    >
      <div className="flex items-start gap-1.5">
        {failed ? (
          <AlertCircle className="text-danger mt-px size-3.5 shrink-0" aria-hidden />
        ) : (
          <Clock className="text-muted-foreground mt-px size-3.5 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate font-medium" title={label}>
            {label}
          </p>
          <p className={cn("mt-0.5", failed ? "text-danger" : "text-muted-foreground")}>
            {failed
              ? (mutation.lastError ?? "Could not be synced.")
              : mutation.attempts > 0
                ? `Retrying — ${mutation.lastError ?? "server unavailable"}`
                : "Waiting to sync"}
          </p>
        </div>
      </div>

      {failed && (
        <div className="mt-1.5 flex justify-end gap-1">
          <button
            type="button"
            onClick={() => void retryMutation(mutation.id)}
            className="text-foreground hover:bg-surface inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium transition-colors"
          >
            <RotateCw className="size-3" aria-hidden />
            Retry
          </button>
          <button
            type="button"
            onClick={() => void handleDiscard()}
            className="text-danger hover:bg-surface inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium transition-colors"
          >
            <Trash2 className="size-3" aria-hidden />
            Discard
          </button>
        </div>
      )}
    </li>
  );
}
