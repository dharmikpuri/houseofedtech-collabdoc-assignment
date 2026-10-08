"use client";

import { ChevronDown, CloudUpload, HardDrive, ListTodo, Radio, Wifi } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SyncDot } from "@/components/sync/sync-indicator";
import { OutboxList } from "@/components/sync/outbox-list";
import { describeSyncState, type SyncState, type WsStatus } from "@/lib/sync/status";
import type { Mutation } from "@/lib/outbox/types";

const WS_LABELS: Record<WsStatus, string> = {
  connected: "Connected",
  connecting: "Connecting…",
  disconnected: "Disconnected",
};

/**
 * The editor's sync status: a compact pill that expands into a details panel.
 *
 * The panel exposes the individual signals `deriveSyncState` combines, so the
 * local-first behaviour is visible and explainable rather than a black box:
 * whether the device is online, whether the real-time server is reachable, how
 * many local edits are still waiting to be acknowledged, and whether the local
 * copy is loaded.
 *
 * Status transitions are announced through a separate polite live region. The
 * trigger itself is a button, and a button must not also be `role="status"`.
 */
export function SyncDetails({
  state,
  online,
  wsStatus,
  realtimeEnabled,
  pendingUpdates,
  lastSyncedAt,
  localReady,
  queued = [],
  authPaused = false,
}: {
  state: SyncState;
  online: boolean;
  wsStatus: WsStatus;
  realtimeEnabled: boolean;
  pendingUpdates: number;
  lastSyncedAt: Date | null;
  localReady: boolean;
  /** Queued REST mutations (snapshots, renames) for this document. */
  queued?: readonly Mutation[];
  authPaused?: boolean;
}) {
  const failedCount = queued.filter((m) => m.status === "failed").length;
  const { label, detail } = describeSyncState(state);
  const pendingText =
    pendingUpdates > 0 ? `${pendingUpdates} pending change${pendingUpdates === 1 ? "" : "s"}` : "";

  return (
    <>
      <span className="sr-only" role="status" aria-live="polite">
        {pendingText ? `${label}, ${pendingText}` : label}
      </span>

      <Popover>
        <PopoverTrigger
          className={cn(
            "border-border bg-surface inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
            "text-muted-foreground text-xs font-medium transition-colors",
            "hover:border-border-strong hover:text-foreground",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
          )}
          aria-label={`Sync status: ${label}${pendingText ? `, ${pendingText}` : ""}. Show details`}
        >
          <SyncDot state={state} />
          <span className="whitespace-nowrap">{label}</span>
          {pendingUpdates > 0 && (
            <span className="bg-warning-subtle text-warning rounded-full px-1.5 text-[10px] leading-4 font-semibold tabular-nums">
              {pendingUpdates}
            </span>
          )}
          <ChevronDown className="size-3 opacity-60" aria-hidden />
        </PopoverTrigger>

        <PopoverContent>
          <div className="flex items-center gap-2">
            <SyncDot state={state} />
            <p className="text-sm font-semibold">{label}</p>
          </div>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{detail}</p>

          <dl className="border-border mt-3 space-y-2 border-t pt-3 text-xs">
            <Row icon={<Wifi />} term="Network">
              <span className={online ? "text-success" : "text-warning"}>
                {online ? "Online" : "Offline"}
              </span>
            </Row>

            <Row icon={<Radio />} term="Real-time server">
              {realtimeEnabled ? WS_LABELS[wsStatus] : "Not configured"}
            </Row>

            <Row icon={<CloudUpload />} term="Pending changes">
              {pendingUpdates > 0 ? (
                <span className="text-warning font-medium tabular-nums">{pendingUpdates}</span>
              ) : (
                "None"
              )}
            </Row>

            <Row icon={<ListTodo />} term="Queued actions">
              {queued.length === 0 ? (
                "None"
              ) : (
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    failedCount ? "text-danger" : "text-warning",
                  )}
                >
                  {queued.length}
                  {failedCount ? ` (${failedCount} failed)` : ""}
                </span>
              )}
            </Row>

            <Row icon={<HardDrive />} term="Local copy">
              {localReady ? "Saved on this device" : "Loading…"}
            </Row>
          </dl>

          {queued.length > 0 && (
            <OutboxList
              items={queued}
              authPaused={authPaused}
              className="border-border mt-3 max-h-48 overflow-y-auto border-t pt-3"
            />
          )}

          <p className="text-muted-foreground border-border mt-3 border-t pt-3 text-[11px] leading-relaxed">
            {lastSyncedAt ? (
              <>
                Last synced at{" "}
                <time dateTime={lastSyncedAt.toISOString()}>
                  {lastSyncedAt.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </time>
                .{" "}
              </>
            ) : (
              "Not synced yet this session. "
            )}
            Edits are written to this device first and sync automatically when the connection
            returns — nothing to do on your side.
          </p>
        </PopoverContent>
      </Popover>
    </>
  );
}

function Row({
  icon,
  term,
  children,
}: {
  icon: React.ReactNode;
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground flex items-center gap-1.5 [&_svg]:size-3.5">
        {icon}
        {term}
      </dt>
      <dd className="text-foreground text-right">{children}</dd>
    </div>
  );
}
