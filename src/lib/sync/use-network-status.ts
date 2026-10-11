"use client";

import { useSyncExternalStore } from "react";

/**
 * Tracks browser connectivity.
 *
 * Implemented with `useSyncExternalStore` because that is exactly what it is:
 * a subscription to an external browser store. It returns `true` for the server
 * snapshot so the markup never renders an "offline" state during SSR (which
 * would hydrate-mismatch), then reads the real value on the client.
 *
 * Note that `onLine === true` only means the machine has *a* network interface,
 * not that our server is reachable. The authoritative signal is the WebSocket
 * status reported by the collaboration provider; this is the coarse, instant
 * signal that complements it — see `deriveSyncState`.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function useNetworkStatus(): { online: boolean } {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    // Server snapshot: assume online so SSR output matches the optimistic case.
    () => true,
  );

  return { online };
}
