"use client";

import { useEffect } from "react";
import { toast } from "react-toastify";

import { onSettled, startOutbox } from "@/lib/outbox/outbox";
import { describeMutation, type Mutation } from "@/lib/outbox/types";

/**
 * Mutations older than this were genuinely queued (the user was offline or the
 * server was down). Younger ones were delivered straight away, and the
 * component that made them already told the user — so only the older ones get
 * a background toast, which avoids double-notifying.
 */
const BACKGROUND_AGE_MS = 5_000;

/**
 * Runs the outbox for the signed-in user for as long as the app shell is
 * mounted, and reports background outcomes.
 *
 * Successful background deliveries are batched into one toast ("Synced 3
 * offline changes") rather than one per item, because a reconnect typically
 * drains several at once.
 */
export function OutboxProvider({ userId }: { userId: string }) {
  useEffect(() => startOutbox(userId), [userId]);

  useEffect(() => {
    let syncedCount = 0;
    let timer: number | undefined;

    const flushToast = () => {
      if (syncedCount > 0) {
        toast.success(`Synced ${syncedCount} offline change${syncedCount === 1 ? "" : "s"}`, {
          toastId: "outbox-synced",
        });
      }
      syncedCount = 0;
    };

    const off = onSettled((mutation: Mutation, outcome) => {
      if (Date.now() - mutation.createdAt < BACKGROUND_AGE_MS) return;

      if (outcome.status === "synced") {
        syncedCount += 1;
        window.clearTimeout(timer);
        timer = window.setTimeout(flushToast, 600);
      } else {
        toast.error(`Couldn't sync — ${describeMutation(mutation)}: ${outcome.error}`, {
          toastId: `outbox-failed-${mutation.id}`,
        });
      }
    });

    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
