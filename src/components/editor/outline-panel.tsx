"use client";

import { useMemo } from "react";
import type { Editor } from "@tiptap/react";
import { ListTree } from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { useEditorSnapshot } from "@/components/editor/use-editor-snapshot";

type Heading = { level: number; text: string; pos: number };

/**
 * Table of contents built live from the document's headings. It updates as
 * anyone edits (the CRDT feeds the same editor), and clicking an entry jumps
 * to that heading.
 */
export function OutlinePanel({ editor }: { editor: Editor | null }) {
  const serialized = useEditorSnapshot(
    editor,
    (instance) => {
      const headings: Heading[] = [];
      instance.state.doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          const text = node.textContent.trim();
          if (text) headings.push({ level: Number(node.attrs.level) || 1, text, pos });
          return false;
        }
        return true;
      });
      return JSON.stringify(headings);
    },
    "[]",
  );

  const headings = useMemo(() => JSON.parse(serialized) as Heading[], [serialized]);
  const minLevel = headings.length ? Math.min(...headings.map((heading) => heading.level)) : 1;

  function jump(heading: Heading) {
    if (!editor) return;
    // Place the caret at the start of the heading, then bring it into view.
    editor.commands.setTextSelection(heading.pos + 1);
    const element = editor.view.nodeDOM(heading.pos);
    if (element instanceof HTMLElement) {
      element.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  if (headings.length === 0) {
    return (
      <div className="p-3">
        <EmptyState
          size="sm"
          icon={<ListTree />}
          title="No headings yet"
          description="Add headings (type “/heading” or use the toolbar) and they'll appear here as an outline."
        />
      </div>
    );
  }

  return (
    <nav aria-label="Document outline" className="min-h-0 flex-1 overflow-y-auto p-2">
      <ul className="space-y-0.5">
        {headings.map((heading, index) => (
          <li key={`${heading.pos}-${index}`}>
            <button
              type="button"
              onClick={() => jump(heading)}
              className={cn(
                "hover:bg-muted w-full truncate rounded-md py-1.5 pr-2 text-left text-xs transition-colors",
                heading.level === minLevel
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
              style={{ paddingLeft: `${0.5 + (heading.level - minLevel) * 0.85}rem` }}
              title={heading.text}
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
