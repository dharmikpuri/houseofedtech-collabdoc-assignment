"use client";

import { useState, useTransition } from "react";
import type { RenameResult } from "@/app/(app)/documents/[id]/actions";

/**
 * Inline-editable document title.
 *
 * The title lives in Postgres (not the CRDT), so editing it goes through a
 * server action — passed in as a prop so this client component doesn't import
 * from a dynamic route path. Saves on blur / Enter; reverts on error.
 */
export function DocumentTitle({
  documentId,
  initialTitle,
  canEdit,
  onRename,
}: {
  documentId: string;
  initialTitle: string;
  canEdit: boolean;
  onRename: (documentId: string, title: string) => Promise<RenameResult>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!canEdit) {
    return <h1 className="text-2xl font-semibold tracking-tight">{savedTitle}</h1>;
  }

  function commit() {
    const next = title.trim();
    if (!next || next === savedTitle) {
      setTitle(savedTitle);
      setError(null);
      return;
    }
    startTransition(async () => {
      const result = await onRename(documentId, next);
      if (result.ok) {
        setSavedTitle(next);
        setError(null);
      } else {
        setError(result.error);
        setTitle(savedTitle);
      }
    });
  }

  return (
    <div>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        aria-label="Document title"
        maxLength={200}
        className="w-full bg-transparent text-2xl font-semibold tracking-tight focus:outline-none"
      />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
