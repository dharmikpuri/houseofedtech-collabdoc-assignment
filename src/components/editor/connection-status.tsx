import { cn } from "@/lib/utils";

export type WsStatus = "connecting" | "connected" | "disconnected";

function describe(enabled: boolean, status: WsStatus, synced: boolean) {
  if (!enabled) return { label: "Saved locally", dot: "bg-zinc-400" };
  if (status === "disconnected") return { label: "Offline · saved locally", dot: "bg-amber-500" };
  if (status === "connecting") return { label: "Connecting…", dot: "bg-amber-500" };
  if (!synced) return { label: "Syncing…", dot: "bg-blue-500" };
  return { label: "Synced", dot: "bg-green-500" };
}

export function ConnectionStatus({
  enabled,
  status,
  synced,
}: {
  enabled: boolean;
  status: WsStatus;
  synced: boolean;
}) {
  const { label, dot } = describe(enabled, status, synced);

  return (
    <span
      role="status"
      aria-live="polite"
      className="text-muted-foreground flex items-center gap-1.5 text-xs"
    >
      <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
}
