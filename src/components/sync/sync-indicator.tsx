"use client";

import { cn } from "@/lib/utils";
import { describeSyncState, type SyncState } from "@/lib/sync/status";

/**
 * The status dot. Colour alone never carries the meaning — every use pairs it
 * with a text label or an accessible name — so it stays readable for colour-blind
 * users.
 */
export function SyncDot({ state, className }: { state: SyncState; className?: string }) {
  const { dot, pulse } = describeSyncState(state);

  return (
    <span className={cn("relative flex size-2 shrink-0", className)} aria-hidden>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex size-full rounded-full",
            dot,
            "animate-[pulse-ring_2s_ease-out_infinite]",
          )}
        />
      )}
      <span className={cn("relative inline-flex size-2 rounded-full", dot)} />
    </span>
  );
}

/**
 * Compact status pill for the editor header and app shell.
 *
 * `role="status"` + `aria-live="polite"` means transitions (offline → syncing →
 * synced) are announced to screen readers without stealing focus.
 */
export function SyncPill({
  state,
  pendingUpdates = 0,
  className,
  showLabel = true,
}: {
  state: SyncState;
  pendingUpdates?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const { label, detail } = describeSyncState(state);
  const pendingSuffix =
    pendingUpdates > 0
      ? ` · ${pendingUpdates} pending change${pendingUpdates === 1 ? "" : "s"}`
      : "";

  return (
    <span
      role="status"
      aria-live="polite"
      title={detail}
      className={cn(
        "border-border bg-surface inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-muted-foreground text-xs font-medium",
        className,
      )}
    >
      <SyncDot state={state} />
      {showLabel && (
        <span className="whitespace-nowrap">
          {label}
          {pendingSuffix}
        </span>
      )}
      {/* Always available to assistive tech, even when the label is hidden. */}
      {!showLabel && <span className="sr-only">{label + pendingSuffix}</span>}
    </span>
  );
}
