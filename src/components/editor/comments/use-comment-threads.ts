"use client";

import { useCallback, useEffect, useState } from "react";

import type { ThreadView } from "@/lib/authz/comments";

const POLL_MS = 60_000;

/**
 * The document's comment threads, kept fresh.
 *
 * Loaded at the editor level (not only inside the panel) because anchors are
 * highlighted in the text even while the panel is closed, and only threads the
 * server knows about may be highlighted.
 */
export function useCommentThreads(documentId: string) {
  const [threads, setThreads] = useState<ThreadView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/comments`);
      if (!res.ok) {
        setError("Could not load comments.");
        return;
      }
      const data = (await res.json()) as { threads: ThreadView[] };
      setThreads(data.threads);
      setError(null);
    } catch {
      setError("You're offline — comments will load when you reconnect.");
    }
  }, [documentId]);

  useEffect(() => {
    // First load is scheduled like the polls, so state only changes from callbacks.
    const first = window.setTimeout(() => void reload(), 0);
    const timer = window.setInterval(() => void reload(), POLL_MS);
    const onFocus = () => void reload();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [reload]);

  return { threads, error, reload, setThreads };
}
