import { deleteMutation, loadMutations, saveMutation } from "@/lib/outbox/persistence";
import type {
  EnqueueResult,
  Mutation,
  NewMutation,
  OutboxSnapshot,
  SettleOutcome,
} from "@/lib/outbox/types";

/**
 * The outbox engine: a durable, per-user FIFO of REST mutations that replays
 * itself whenever the network allows.
 *
 * Delivery rules, and why:
 *  - Network error (fetch throws)   → stop the pass, keep everything. Being
 *    offline is not a failure, so it doesn't count as an attempt.
 *  - 401                            → pause until the user signs in again; the
 *    queued work belongs to them and must not be dropped.
 *  - 408 / 429 / 5xx                → transient: exponential backoff (honouring
 *    Retry-After), surfaced as failed only after many attempts.
 *  - Any other 4xx                  → permanent (forbidden, deleted, invalid):
 *    marked failed for the user to retry or discard. Never silently dropped.
 *
 * Ordering: mutations are delivered oldest-first. If one is held back for a
 * retry, later mutations for the *same document* wait behind it, so a document
 * never observes its own changes out of order. Other documents keep flowing.
 *
 * Concurrency: a Web Lock serialises flushes across tabs, and each replay
 * carries its mutation id as an idempotency key, so even a double delivery
 * cannot duplicate a snapshot.
 */

const LOCK_NAME = "collabdoc-outbox-flush";
const CHANNEL_NAME = "collabdoc-outbox";
const POLL_MS = 15_000;
const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 5 * 60_000;
const MAX_TRANSIENT_ATTEMPTS = 10;

const EMPTY: OutboxSnapshot = Object.freeze({ items: Object.freeze([]), authPaused: false });

let currentUserId: string | null = null;
let items: Mutation[] = [];
let authPaused = false;
let snapshot: OutboxSnapshot = EMPTY;

const listeners = new Set<() => void>();
const settleListeners = new Set<(mutation: Mutation, outcome: SettleOutcome) => void>();

let flushing = false;
let flushQueued = false;
let channel: BroadcastChannel | null = null;

// ── State & subscription ─────────────────────────────────────────────────────

function publish() {
  // A fresh object per change is what lets useSyncExternalStore detect it; the
  // same object is returned between changes, which keeps React from looping.
  snapshot = {
    items: Object.freeze([...items].sort((a, b) => a.createdAt - b.createdAt)),
    authPaused,
  };
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): OutboxSnapshot {
  return snapshot;
}

export function getServerSnapshot(): OutboxSnapshot {
  return EMPTY;
}

/** Called whenever a mutation is delivered or permanently rejected. */
export function onSettled(
  listener: (mutation: Mutation, outcome: SettleOutcome) => void,
): () => void {
  settleListeners.add(listener);
  return () => settleListeners.delete(listener);
}

function emitSettled(mutation: Mutation, outcome: SettleOutcome) {
  for (const listener of settleListeners) listener(mutation, outcome);
}

function broadcast() {
  try {
    channel?.postMessage("changed");
  } catch {
    // Channel closed; other tabs catch up on their next poll.
  }
}

async function reload() {
  if (!currentUserId) return;
  items = await loadMutations(currentUserId);
  publish();
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

/**
 * Starts the engine for the signed-in user. Returns a disposer. Calling it for
 * a different user swaps the queue: mutations are always scoped to their owner.
 */
export function startOutbox(userId: string): () => void {
  currentUserId = userId;
  authPaused = false;
  items = [];
  publish();

  const trigger = () => void flush();
  const onVisible = () => {
    if (document.visibilityState === "visible") trigger();
  };

  window.addEventListener("online", trigger);
  document.addEventListener("visibilitychange", onVisible);
  const timer = window.setInterval(() => {
    if (items.some((m) => m.status === "pending" && m.nextAttemptAt <= Date.now())) trigger();
  }, POLL_MS);

  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => void reload();
  }

  void reload().then(trigger);

  return () => {
    window.removeEventListener("online", trigger);
    document.removeEventListener("visibilitychange", onVisible);
    window.clearInterval(timer);
    channel?.close();
    channel = null;
    if (currentUserId === userId) {
      currentUserId = null;
      items = [];
      authPaused = false;
      publish();
    }
  };
}

// ── Public operations ────────────────────────────────────────────────────────

/** A fresh idempotency key (also used by direct, non-queued requests). */
export function createMutationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Non-secure contexts lack randomUUID; this only needs to be unique, and it
  // stays inside the server's accepted alphabet.
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export async function enqueue(input: NewMutation): Promise<Mutation> {
  if (!currentUserId) throw new Error("Outbox is not running");

  const mutation = {
    ...input,
    id: createMutationId(),
    userId: currentUserId,
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: 0,
    status: "pending",
  } as Mutation;

  // Only the newest title matters: an older queued rename of the same document
  // is superseded rather than replayed.
  if (mutation.kind === "document.rename") {
    const superseded = items.filter(
      (m) => m.kind === "document.rename" && m.documentId === mutation.documentId,
    );
    for (const old of superseded) await deleteMutation(old.id);
    items = items.filter((m) => !superseded.includes(m));
  }

  await saveMutation(mutation);
  // A flush may have re-read the store while we were writing and already picked
  // this mutation up; filter first so it is never listed twice.
  items = [...items.filter((m) => m.id !== mutation.id), mutation];
  publish();
  broadcast();
  void flush();
  return mutation;
}

/**
 * Enqueues and waits briefly for delivery, so callers can tell the user
 * "saved" when online and "saved offline — will sync" when not. The mutation
 * is durable either way; the timeout only decides which message to show.
 */
export async function enqueueAndWait(
  input: NewMutation,
  timeoutMs = 8_000,
): Promise<EnqueueResult> {
  let resolveSettled: (outcome: SettleOutcome) => void = () => {};
  const settled = new Promise<SettleOutcome>((resolve) => {
    resolveSettled = resolve;
  });

  let targetId: string | null = null;
  const early: [Mutation, SettleOutcome][] = [];
  const offSettled = onSettled((m, outcome) => {
    if (targetId === null) early.push([m, outcome]);
    else if (m.id === targetId) resolveSettled(outcome);
  });
  // Another tab may deliver our mutation (it holds the flush lock and re-reads
  // the shared queue). We then get no settle event here — only the item
  // disappearing from the queue after a cross-tab reload — which also means
  // it was delivered, since discards only come from the user.
  const offGone = subscribe(() => {
    if (targetId && !items.some((m) => m.id === targetId)) resolveSettled({ status: "synced" });
  });
  const off = () => {
    offSettled();
    offGone();
  };

  const mutation = await enqueue(input);
  targetId = mutation.id;
  const already = early.find(([m]) => m.id === mutation.id);
  if (already) resolveSettled(already[1]);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    off();
    return { status: "queued", mutation };
  }

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  const outcome = await Promise.race([settled, timeout]);
  off();

  if (!outcome) return { status: "queued", mutation };
  if (outcome.status === "synced") return { status: "synced", mutation };
  return { status: "failed", mutation, error: outcome.error };
}

export async function retryMutation(id: string): Promise<void> {
  const mutation = items.find((m) => m.id === id);
  if (!mutation) return;
  const next: Mutation = {
    ...mutation,
    status: "pending",
    attempts: 0,
    nextAttemptAt: 0,
    lastError: undefined,
  };
  await saveMutation(next);
  items = items.map((m) => (m.id === id ? next : m));
  publish();
  broadcast();
  void flush();
}

export async function discardMutation(id: string): Promise<void> {
  await deleteMutation(id);
  items = items.filter((m) => m.id !== id);
  publish();
  broadcast();
}

// ── Delivery ─────────────────────────────────────────────────────────────────

type Delivery =
  | { type: "ok" }
  | { type: "network" }
  | { type: "unauthenticated" }
  | { type: "transient"; retryAfterMs?: number; error: string }
  | { type: "fatal"; error: string };

function toRequest(mutation: Mutation): { url: string; init: RequestInit } {
  switch (mutation.kind) {
    case "version.create":
      return {
        url: `/api/documents/${encodeURIComponent(mutation.documentId)}/versions`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: mutation.payload.label,
            content: mutation.payload.content,
            capturedAt: mutation.payload.capturedAt,
            clientMutationId: mutation.id,
          }),
        },
      };
    case "document.rename":
      return {
        url: `/api/documents/${encodeURIComponent(mutation.documentId)}`,
        init: {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: mutation.payload.title }),
        },
      };
  }
}

const FATAL_MESSAGES: Record<number, string> = {
  400: "The server rejected this change as invalid.",
  403: "You no longer have permission to make this change.",
  404: "This document no longer exists or was unshared with you.",
  409: "This change conflicts with an existing one.",
  413: "This document is too large to save as a version.",
};

async function deliver(mutation: Mutation): Promise<Delivery> {
  const { url, init } = toRequest(mutation);

  let res: Response;
  try {
    res = await fetch(url, { ...init, credentials: "same-origin" });
  } catch {
    return { type: "network" };
  }

  if (res.ok) return { type: "ok" };
  if (res.status === 401) return { type: "unauthenticated" };

  const body = (await res.json().catch(() => ({}))) as { error?: string };

  if (res.status === 408 || res.status === 429 || res.status >= 500) {
    const retryAfter = Number(res.headers.get("Retry-After"));
    return {
      type: "transient",
      retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : undefined,
      error: body.error ?? `Server error (${res.status})`,
    };
  }

  return {
    type: "fatal",
    error: FATAL_MESSAGES[res.status] ?? body.error ?? `Request failed (${res.status})`,
  };
}

function backoff(attempts: number, retryAfterMs?: number): number {
  const exponential = Math.min(BASE_BACKOFF_MS * 2 ** attempts, MAX_BACKOFF_MS);
  // Jitter spreads retries from many clients so a recovering server isn't hit
  // by a synchronised wave.
  const jittered = exponential * (0.75 + Math.random() * 0.5);
  return Math.max(jittered, retryAfterMs ?? 0);
}

async function withCrossTabLock(work: () => Promise<void>): Promise<void> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks?.request) return work();
  // Wait for (rather than skip) a flush running in another tab. The waiting tab
  // re-reads the queue once it holds the lock, so it sees what the other tab
  // already delivered and never sends it twice — and it still sends anything
  // it enqueued itself after the other tab's pass began.
  await locks.request(LOCK_NAME, async () => {
    await work();
  });
}

async function flush(): Promise<void> {
  if (flushing) {
    flushQueued = true;
    return;
  }
  if (!currentUserId || authPaused) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  flushing = true;
  // Only announce to other tabs when this pass actually changed the queue.
  // Broadcasting unconditionally would let two idle tabs ping-pong forever.
  let changed = false;
  try {
    await withCrossTabLock(async () => {
      // Re-read inside the lock: another tab may have delivered or discarded
      // items since our in-memory copy was last refreshed.
      await reload();
      const userId = currentUserId;
      const blockedDocuments = new Set<string>();
      const due = items
        .filter((m) => m.status === "pending")
        .sort((a, b) => a.createdAt - b.createdAt);

      for (const mutation of due) {
        // The user may have signed out mid-flush.
        if (currentUserId !== userId) return;
        if (blockedDocuments.has(mutation.documentId)) continue;
        if (mutation.nextAttemptAt > Date.now()) {
          blockedDocuments.add(mutation.documentId);
          continue;
        }

        const result = await deliver(mutation);

        if (result.type === "network") return;

        if (result.type === "unauthenticated") {
          authPaused = true;
          publish();
          return;
        }

        changed = true;

        if (result.type === "ok") {
          await deleteMutation(mutation.id);
          items = items.filter((m) => m.id !== mutation.id);
          publish();
          emitSettled(mutation, { status: "synced" });
          continue;
        }

        const attempts = mutation.attempts + 1;
        const giveUp = result.type === "fatal" || attempts >= MAX_TRANSIENT_ATTEMPTS;
        const next: Mutation = {
          ...mutation,
          attempts,
          lastError: result.error,
          status: giveUp ? "failed" : "pending",
          // `giveUp` already covers "fatal", so the retry branch is transient-only.
          nextAttemptAt: giveUp ? 0 : Date.now() + backoff(attempts, result.retryAfterMs),
        };
        await saveMutation(next);
        items = items.map((m) => (m.id === mutation.id ? next : m));
        publish();
        blockedDocuments.add(mutation.documentId);
        if (giveUp) emitSettled(next, { status: "failed", error: result.error });
      }
    });
  } finally {
    flushing = false;
    if (changed) broadcast();
    if (flushQueued) {
      flushQueued = false;
      void flush();
    }
  }
}
