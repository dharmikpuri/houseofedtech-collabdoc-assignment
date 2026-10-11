"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { List, Loader2, MessageSquarePlus, Scissors, Sparkles, Wand2 } from "lucide-react";
import { toast } from "react-toastify";

import { cn } from "@/lib/utils";

type RewriteMode = "improve" | "shorten" | "bulletize";

const ACTIONS: { mode: RewriteMode; label: string; icon: typeof Wand2 }[] = [
  { mode: "improve", label: "Improve", icon: Wand2 },
  { mode: "shorten", label: "Shorten", icon: Scissors },
  { mode: "bulletize", label: "Bullets", icon: List },
];

/** Selections beyond this are rejected by the server; fail fast in the UI. */
const MAX_SELECTION = 8_000;

/**
 * Floating AI actions over a text selection.
 *
 * The rewritten text is applied with `insertContentAt` over the original
 * range rather than by replacing the whole document, so the change is a normal
 * ProseMirror transaction: it merges through Yjs like any keystroke, stays in
 * the undo stack, and never clobbers a collaborator's concurrent edit.
 */
export function AiBubbleMenu({
  editor,
  documentId,
  aiEnabled,
  onComment,
}: {
  editor: Editor | null;
  documentId: string;
  /** AI rewrite actions (requires AI to be configured and edit access). */
  aiEnabled: boolean;
  /** Opens a comment thread on the selection; omitted when commenting isn't allowed. */
  onComment?: () => void;
}) {
  const [busy, setBusy] = useState<RewriteMode | null>(null);

  if (!editor || (!aiEnabled && !onComment)) return null;

  async function handleRewrite(mode: RewriteMode) {
    if (!editor || busy) return;

    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, " ").trim();

    if (!selected) return;
    if (selected.length > MAX_SELECTION) {
      toast.error("Select a shorter passage (up to 8,000 characters).");
      return;
    }

    setBusy(mode);
    try {
      const res = await fetch(`/api/documents/${documentId}/ai/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selected, mode }),
      });
      const data = (await res.json().catch(() => ({}))) as { result?: string; error?: string };

      if (!res.ok || !data.result) {
        toast.error(data.error ?? "Could not rewrite that passage.");
        return;
      }

      // Re-read the selection: the document may have shifted while the request
      // was in flight (a collaborator typing above it), so the original offsets
      // could now point somewhere else.
      const current = editor.state.selection;
      editor
        .chain()
        .focus()
        .insertContentAt({ from: current.from, to: current.to }, data.result)
        .run();

      toast.success(mode === "bulletize" ? "Converted to bullets" : "Rewritten");
    } catch {
      toast.error("You appear to be offline. AI features need a connection.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <BubbleMenu
      editor={editor}
      // Only offer AI actions for a real, non-empty text selection.
      shouldShow={({ editor: instance, from, to }: { editor: Editor; from: number; to: number }) =>
        instance.isEditable &&
        from !== to &&
        instance.state.doc.textBetween(from, to, " ").trim().length > 0
      }
      options={{ placement: "top", offset: 8 }}
    >
      <div
        className="bg-overlay border-border flex items-center gap-0.5 rounded-lg border p-1 shadow-md"
        role="toolbar"
        aria-label="Actions for selection"
      >
        {onComment && (
          <button
            type="button"
            onClick={onComment}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            )}
          >
            <MessageSquarePlus className="size-3.5" aria-hidden />
            Comment
          </button>
        )}

        {onComment && aiEnabled && <span className="bg-border mx-0.5 h-5 w-px" aria-hidden />}

        {aiEnabled && (
          <>
            <span className="text-muted-foreground flex items-center gap-1 px-1.5 text-[11px] font-medium">
              <Sparkles className="size-3" aria-hidden />
              AI
            </span>
            <span className="bg-border mx-0.5 h-5 w-px" aria-hidden />
          </>
        )}

        {aiEnabled &&
          ACTIONS.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleRewrite(mode)}
              disabled={busy !== null}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                "text-muted-foreground hover:bg-muted hover:text-foreground",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              {busy === mode ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Icon className="size-3.5" aria-hidden />
              )}
              {label}
            </button>
          ))}
      </div>
    </BubbleMenu>
  );
}
