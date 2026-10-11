"use client";

import { useState } from "react";
import { AlertCircle, CloudOff, Loader2, Sparkles } from "lucide-react";

import { requestEditorContent } from "@/lib/commands/bus";

import { cn } from "@/lib/utils";
import { discardMutation, enqueue } from "@/lib/outbox/outbox";
import { useOutbox } from "@/lib/outbox/use-outbox";
import { useNetworkStatus } from "@/lib/sync/use-network-status";
import type { Mutation } from "@/lib/outbox/types";

type RenameMutation = Extract<Mutation, { kind: "document.rename" }>;

/**
 * Inline-editable document title, routed through the offline mutation queue.
 *
 * The title lives in Postgres (not the CRDT), so it can't merge like body
 * text. Instead a rename is queued: it shows immediately, survives a reload
 * while offline, and is delivered when the connection returns. Only the newest
 * queued title is ever sent (the outbox supersedes older renames).
 *
 * What's displayed is derived, not copied, from the queue:
 *   editing            → the draft being typed
 *   rename pending     → the queued title (optimistic)
 *   rename failed      → the last title the server accepted, plus the reason
 *   nothing queued     → the last title the server accepted
 */
export function DocumentTitle({
  documentId,
  initialTitle,
  canEdit,
  aiEnabled = false,
}: {
  documentId: string;
  initialTitle: string;
  canEdit: boolean;
  aiEnabled?: boolean;
}) {
  const { items } = useOutbox();
  const { online } = useNetworkStatus();

  const [serverTitle, setServerTitle] = useState(initialTitle);
  const [draft, setDraft] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const queued = items.find(
    (m): m is RenameMutation => m.kind === "document.rename" && m.documentId === documentId,
  );

  // When a pending rename leaves the queue it was delivered — by this tab or
  // another — so it becomes the server's title. Tracked during render (React's
  // "adjust state when a value changes" pattern) rather than in an effect, so
  // there's no frame where the old title flashes back.
  const [lastQueued, setLastQueued] = useState<RenameMutation | undefined>(queued);
  if (queued !== lastQueued) {
    if (!queued && lastQueued?.status === "pending") setServerTitle(lastQueued.payload.title);
    setLastQueued(queued);
  }

  const pending = queued?.status === "pending";
  const failedMutation = queued?.status === "failed" ? queued : undefined;
  const shown = draft ?? (queued?.status === "pending" ? queued.payload.title : serverTitle);

  if (!canEdit) {
    return (
      <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{serverTitle}</h1>
    );
  }

  async function rename(next: string) {
    const current = queued?.status === "pending" ? queued.payload.title : serverTitle;
    if (!next || next === current) return;

    setLocalError(null);
    try {
      await enqueue({ kind: "document.rename", documentId, payload: { title: next } });
    } catch {
      setLocalError("Couldn't save the new title. Please try again.");
    }
  }

  async function commit() {
    if (draft === null) return;
    const next = draft.trim();
    setDraft(null);
    await rename(next);
  }

  const error =
    localError ?? (failedMutation ? (failedMutation.lastError ?? "Rename failed.") : null);

  return (
    <div>
      {/* A styled input rather than a contentEditable heading: it keeps native
          text-editing behaviour (selection, undo, IME) for free. */}
      <input
        value={shown}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            // Capture the element now: React clears currentTarget once the
            // handler returns.
            const input = event.currentTarget;
            setDraft(null);
            setLocalError(null);
            // Blur on the next frame, after the cleared draft has rendered, so
            // the blur handler sees no draft and commits nothing.
            requestAnimationFrame(() => input.blur());
          }
        }}
        aria-label="Document title"
        aria-invalid={Boolean(error)}
        aria-describedby={error || pending ? `title-status-${documentId}` : undefined}
        maxLength={200}
        className={cn(
          "-mx-1.5 w-full truncate rounded-md bg-transparent px-1.5 py-0.5",
          "text-xl font-semibold tracking-tight sm:text-2xl",
          "hover:bg-muted/60 focus:bg-muted/60 transition-colors focus:outline-none",
          error && "text-danger",
        )}
      />

      {error ? (
        <p
          id={`title-status-${documentId}`}
          role="alert"
          className="text-danger mt-1 flex items-center gap-1 text-xs"
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          <span>Title not saved: {error}</span>
          {failedMutation && (
            <button
              type="button"
              onClick={() => void discardMutation(failedMutation.id)}
              className="ml-1 font-medium underline underline-offset-2"
            >
              Dismiss
            </button>
          )}
        </p>
      ) : pending ? (
        <p
          id={`title-status-${documentId}`}
          className="text-muted-foreground mt-1 flex items-center gap-1 text-xs"
        >
          {online ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Saving title…
            </>
          ) : (
            <>
              <CloudOff className="size-3.5" aria-hidden />
              Title saved on this device — it will sync when you&apos;re back online.
            </>
          )}
        </p>
      ) : null}

      {aiEnabled && (
        <TitleSuggestion
          documentId={documentId}
          untitled={shown.trim() === "" || shown.trim().toLowerCase() === "untitled"}
          onAccept={(title) => void rename(title)}
        />
      )}
    </div>
  );
}

/**
 * Suggests a title from the document's content. Nothing changes until the
 * user presses "Use" — AI proposes, the person decides — and accepting goes
 * through the same offline-capable rename as typing a title.
 */
function TitleSuggestion({
  documentId,
  untitled,
  onAccept,
}: {
  documentId: string;
  untitled: boolean;
  onAccept: (title: string) => void;
}) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function suggest() {
    setBusy(true);
    setError(null);
    try {
      const content = await requestEditorContent();
      if (!content) {
        setError("The document is still loading — try again in a moment.");
        return;
      }
      const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/ai/title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await res.json().catch(() => ({}))) as { title?: string; error?: string };
      if (!res.ok || !data.title) setError(data.error ?? "No suggestion this time.");
      else setSuggestion(data.title);
    } catch {
      setError("You appear to be offline. AI features need a connection.");
    } finally {
      setBusy(false);
    }
  }

  if (suggestion) {
    return (
      <div className="border-primary/30 bg-primary-subtle/50 mt-1.5 flex flex-wrap items-center gap-2 rounded-md border px-2 py-1 text-xs">
        <Sparkles className="text-primary size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          Suggested: <span className="font-medium">{suggestion}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            onAccept(suggestion);
            setSuggestion(null);
          }}
          className="text-primary font-medium hover:underline"
        >
          Use
        </button>
        <button
          type="button"
          onClick={() => setSuggestion(null)}
          className="text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-2 text-xs print:hidden">
      <button
        type="button"
        onClick={() => void suggest()}
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-1 rounded transition-colors disabled:opacity-60",
          untitled
            ? "text-primary font-medium hover:underline"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="size-3.5" aria-hidden />
        )}
        {untitled ? "Name it with AI" : "Suggest title"}
      </button>
      {error && (
        <span className="text-danger" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
