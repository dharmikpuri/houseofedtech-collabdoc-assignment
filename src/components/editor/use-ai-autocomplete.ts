"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Editor } from "@tiptap/react";
import type { Transaction } from "@tiptap/pm/state";

import {
  autocompleteKey,
  clearSuggestion,
  showSuggestion,
} from "@/components/editor/extensions/ai-autocomplete";

const DEBOUNCE_MS = 900;
const CONTEXT_CHARS = 2_000;
const MIN_BLOCK_CHARS = 12;

/**
 * Drives inline autocomplete: after the user pauses typing at the end of a
 * paragraph, asks the server for a continuation and shows it as ghost text.
 *
 * Deliberately conservative, because every request costs tokens:
 *  - only after *local* edits (never a collaborator's synced change);
 *  - only at the end of a non-trivial paragraph, never inside code blocks;
 *  - any keystroke cancels the in-flight request;
 *  - a response is discarded if the document or caret moved meanwhile;
 *  - nothing is requested while offline.
 */
export function useAiAutocomplete(editor: Editor | null, documentId: string, enabled: boolean) {
  useEffect(() => {
    if (!editor || !enabled) return;

    let timer: number | undefined;
    let inFlight: AbortController | null = null;

    const cancel = () => {
      window.clearTimeout(timer);
      inFlight?.abort();
      inFlight = null;
    };

    const request = async () => {
      const { state } = editor;
      const { selection } = state;
      if (!selection.empty || !editor.isEditable || !navigator.onLine) return;

      const $head = selection.$head;
      const block = $head.parent;
      if (!block.isTextblock || block.type.name === "codeBlock") return;
      if ($head.parentOffset !== block.content.size) return;
      if (block.textContent.trim().length < MIN_BLOCK_CHARS) return;

      const pos = selection.from;
      const doc = state.doc;
      const before = doc.textBetween(Math.max(0, pos - CONTEXT_CHARS), pos, "\n", " ");

      const controller = new AbortController();
      inFlight = controller;
      try {
        const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/ai/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ before }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const { completion } = (await res.json()) as { completion?: string };
        if (!completion?.trim()) return;
        // Only show it if nothing moved while we waited.
        if (editor.isDestroyed || editor.state.doc !== doc || editor.state.selection.from !== pos)
          return;
        showSuggestion(editor.view, completion, pos);
      } catch {
        // Aborted or offline: simply no suggestion.
      } finally {
        if (inFlight === controller) inFlight = null;
      }
    };

    const onUpdate = ({ transaction }: { transaction: Transaction }) => {
      // Changes synced from collaborators carry the y-sync meta; ignore them.
      if (transaction.getMeta("y-sync$")) return;
      if (!transaction.docChanged) return;
      cancel();
      timer = window.setTimeout(() => void request(), DEBOUNCE_MS);
    };

    const onBlur = () => {
      cancel();
      if (!editor.isDestroyed) clearSuggestion(editor.view);
    };

    editor.on("update", onUpdate);
    editor.on("blur", onBlur);
    return () => {
      cancel();
      editor.off("update", onUpdate);
      editor.off("blur", onBlur);
      if (!editor.isDestroyed) clearSuggestion(editor.view);
    };
  }, [editor, documentId, enabled]);
}

/** Whether a suggestion is currently visible (for the screen-reader hint). */
export function useHasSuggestion(editor: Editor | null): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (!editor) return () => {};
      editor.on("transaction", onChange);
      return () => editor.off("transaction", onChange);
    },
    () =>
      Boolean(editor && !editor.isDestroyed && autocompleteKey.getState(editor.state)?.suggestion),
    () => false,
  );
}
