"use client";

import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

type ToolbarButton = {
  label: string;
  title: string;
  isActive: () => boolean;
  run: () => void;
};

/**
 * Minimal formatting toolbar. Kept intentionally small — the point of this
 * phase is the local-first document model, not a full word processor.
 */
export function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const buttons: ToolbarButton[] = [
    {
      label: "B",
      title: "Bold",
      isActive: () => editor.isActive("bold"),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "I",
      title: "Italic",
      isActive: () => editor.isActive("italic"),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "H1",
      title: "Heading 1",
      isActive: () => editor.isActive("heading", { level: 1 }),
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "H2",
      title: "Heading 2",
      isActive: () => editor.isActive("heading", { level: 2 }),
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "• List",
      title: "Bullet list",
      isActive: () => editor.isActive("bulletList"),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "1. List",
      title: "Ordered list",
      isActive: () => editor.isActive("orderedList"),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "❝",
      title: "Quote",
      isActive: () => editor.isActive("blockquote"),
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "</>",
      title: "Code block",
      isActive: () => editor.isActive("codeBlock"),
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
  ];

  return (
    <div className="border-border flex flex-wrap items-center gap-1 border-b pb-2">
      {buttons.map((button) => (
        <button
          key={button.title}
          type="button"
          title={button.title}
          aria-label={button.title}
          aria-pressed={button.isActive()}
          onClick={button.run}
          className={cn(
            "hover:bg-muted rounded px-2 py-1 text-sm transition-colors",
            "focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
            button.isActive() && "bg-muted font-semibold",
          )}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}
