/**
 * The user-facing synchronisation state model.
 *
 * Several independent signals feed into "is my work safe?":
 *   - browser connectivity (`navigator.onLine`)
 *   - the collaboration WebSocket's connection status
 *   - whether the CRDT has finished its initial sync with the server
 *   - whether local IndexedDB persistence has loaded
 *   - how many local edits have not yet been acknowledged
 *
 * Deriving the label in each component that needs it would let those rules
 * drift apart. Instead every surface — the editor pill, the sidebar indicator,
 * the sync drawer — renders from `deriveSyncState`, so they can never disagree.
 *
 * The ordering below is deliberate: it answers "what does the user most need to
 * know right now?", with data-safety messaging taking precedence over
 * connection detail.
 */

export type WsStatus = "connecting" | "connected" | "disconnected";

export type SyncState =
  /** Real-time is switched off (no WS URL configured); local-only editing. */
  | "local-only"
  /** No network. Edits are safe in IndexedDB and will sync on reconnect. */
  | "offline"
  /** Network is back / first connection in progress. */
  | "connecting"
  /** Connected; exchanging CRDT updates with the server. */
  | "syncing"
  /** Connected and fully reconciled. */
  | "synced";

export type SyncInputs = {
  /** False when NEXT_PUBLIC_COLLAB_WS_URL is unset. */
  realtimeEnabled: boolean;
  online: boolean;
  wsStatus: WsStatus;
  /** The provider has completed its initial handshake for this document. */
  synced: boolean;
  /** Local edits not yet acknowledged by the server. */
  pendingUpdates: number;
  /** REST mutations (snapshots, renames) waiting in the offline queue. */
  queuedActions?: number;
};

export function deriveSyncState(input: SyncInputs): SyncState {
  if (!input.realtimeEnabled) return "local-only";
  // Trust the OS signal first: if the machine is offline, the socket's own
  // "connecting" retry loop is noise the user doesn't need to see.
  if (!input.online) return "offline";
  if (input.wsStatus === "disconnected") return "offline";
  if (input.wsStatus === "connecting") return "connecting";
  if (!input.synced || input.pendingUpdates > 0 || (input.queuedActions ?? 0) > 0) {
    return "syncing";
  }
  return "synced";
}

type Presentation = {
  label: string;
  /** Longer explanation for tooltips and the sync drawer. */
  detail: string;
  /** Token-based colour class for the status dot. */
  dot: string;
  /** Whether the dot should render an animated halo. */
  pulse: boolean;
  tone: "neutral" | "success" | "warning" | "info";
};

const PRESENTATION: Record<SyncState, Presentation> = {
  "local-only": {
    label: "Saved locally",
    detail:
      "Real-time collaboration is not configured, so this document is stored on this device only.",
    dot: "bg-muted-foreground",
    pulse: false,
    tone: "neutral",
  },
  offline: {
    label: "Offline",
    detail:
      "You're offline. Every edit is saved to this device and will sync automatically when you reconnect.",
    dot: "bg-warning",
    pulse: false,
    tone: "warning",
  },
  connecting: {
    label: "Connecting",
    detail: "Reaching the collaboration server. Your edits are safe on this device meanwhile.",
    dot: "bg-warning",
    pulse: true,
    tone: "warning",
  },
  syncing: {
    label: "Syncing",
    detail: "Sending your local changes and applying everyone else's.",
    dot: "bg-info",
    pulse: true,
    tone: "info",
  },
  synced: {
    label: "Synced",
    detail: "All changes are saved and shared with your collaborators.",
    dot: "bg-success",
    pulse: false,
    tone: "success",
  },
};

export function describeSyncState(state: SyncState): Presentation {
  return PRESENTATION[state];
}
