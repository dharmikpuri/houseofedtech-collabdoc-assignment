"use client";

import { useSyncExternalStore } from "react";
import type { Editor } from "@tiptap/react";

/**
 * Subscribes a component to a derived value of the editor document.
 *
 * TipTap mutates one Editor instance in place, so React has no signal to
 * re-render on edits. `compute` must return a *primitive* (typically a
 * serialised string) so React can tell whether anything actually changed and
 * skip re-rendering when it didn't.
 */
export function useEditorSnapshot<T extends string | number | boolean>(
  editor: Editor | null,
  compute: (editor: Editor) => T,
  fallback: T,
): T {
  return useSyncExternalStore(
    (onChange) => {
      if (!editor) return () => {};
      editor.on("update", onChange);
      editor.on("create", onChange);
      return () => {
        editor.off("update", onChange);
        editor.off("create", onChange);
      };
    },
    () => (editor && !editor.isDestroyed ? compute(editor) : fallback),
    () => fallback,
  );
}
