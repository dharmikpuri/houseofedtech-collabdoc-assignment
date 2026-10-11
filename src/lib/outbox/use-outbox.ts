"use client";

import { useSyncExternalStore } from "react";

import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/outbox/outbox";
import type { OutboxSnapshot } from "@/lib/outbox/types";

/** Live view of the current user's outbox (empty during SSR). */
export function useOutbox(): OutboxSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
