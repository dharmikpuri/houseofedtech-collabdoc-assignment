/**
 * The offline mutation queue ("outbox") data model.
 *
 * Document *content* never goes through here — Yjs already merges it offline.
 * The outbox exists for the REST mutations that sit beside the CRDT (saving a
 * snapshot, renaming) so they too survive being made without a connection.
 *
 * Deliberately NOT queued: sharing, revoking access and deleting documents.
 * Replaying a permission change minutes or hours after the user made it can
 * grant or remove access at a moment nobody expects, so those actions require
 * a live connection and say so in the UI.
 */

export type VersionCreatePayload = {
  label: string;
  /** TipTap JSON captured at the moment the user saved. */
  content: unknown;
  /** ISO timestamp of the capture, so the timeline orders it truthfully. */
  capturedAt: string;
};

export type RenamePayload = {
  title: string;
};

type MutationBase = {
  /** Also the idempotency key sent to the server. */
  id: string;
  /** Owner of the mutation; never replayed under a different session. */
  userId: string;
  documentId: string;
  /** Epoch ms when the user performed the action. */
  createdAt: number;
  attempts: number;
  /** Epoch ms before which the mutation must not be retried (backoff). */
  nextAttemptAt: number;
  status: "pending" | "failed";
  /** Human-readable reason for the most recent failure. */
  lastError?: string;
};

export type Mutation =
  | (MutationBase & { kind: "version.create"; payload: VersionCreatePayload })
  | (MutationBase & { kind: "document.rename"; payload: RenamePayload });

export type MutationKind = Mutation["kind"];

/** What the caller supplies; bookkeeping fields are filled in by the outbox. */
export type NewMutation =
  | { kind: "version.create"; documentId: string; payload: VersionCreatePayload }
  | { kind: "document.rename"; documentId: string; payload: RenamePayload };

export type OutboxSnapshot = {
  items: readonly Mutation[];
  /**
   * The server rejected our session while flushing. Queued work is kept, but
   * nothing more is sent until the user signs in again.
   */
  authPaused: boolean;
};

export type SettleOutcome = { status: "synced" } | { status: "failed"; error: string };

/** Outcome of `enqueueAndWait`: delivered now, safely queued, or rejected. */
export type EnqueueResult =
  | { status: "synced"; mutation: Mutation }
  | { status: "queued"; mutation: Mutation }
  | { status: "failed"; mutation: Mutation; error: string };

/** Short, user-facing description of a queued action. */
export function describeMutation(mutation: Mutation): string {
  switch (mutation.kind) {
    case "version.create":
      return `Save version “${mutation.payload.label}”`;
    case "document.rename":
      return `Rename to “${mutation.payload.title}”`;
  }
}
