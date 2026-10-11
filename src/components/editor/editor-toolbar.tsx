"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code2,
  ExternalLink,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  Link2Off,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline,
  Undo2,
  WandSparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type ToolbarItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

const GROUPS: ToolbarItem[][] = [
  [
    {
      icon: Bold,
      label: "Bold",
      shortcut: "Ctrl+B",
      isActive: (e) => e.isActive("bold"),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      icon: Italic,
      label: "Italic",
      shortcut: "Ctrl+I",
      isActive: (e) => e.isActive("italic"),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      icon: Underline,
      label: "Underline",
      shortcut: "Ctrl+U",
      isActive: (e) => e.isActive("underline"),
      run: (e) => e.chain().focus().toggleUnderline().run(),
    },
    {
      icon: Strikethrough,
      label: "Strikethrough",
      isActive: (e) => e.isActive("strike"),
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
    {
      icon: Highlighter,
      label: "Highlight",
      shortcut: "Ctrl+Shift+H",
      isActive: (e) => e.isActive("highlight"),
      run: (e) => e.chain().focus().toggleHighlight().run(),
    },
    {
      icon: Code2,
      label: "Inline code",
      isActive: (e) => e.isActive("code"),
      run: (e) => e.chain().focus().toggleCode().run(),
    },
  ],
  [
    {
      icon: Heading1,
      label: "Heading 1",
      isActive: (e) => e.isActive("heading", { level: 1 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      icon: Heading2,
      label: "Heading 2",
      isActive: (e) => e.isActive("heading", { level: 2 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: Heading3,
      label: "Heading 3",
      isActive: (e) => e.isActive("heading", { level: 3 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
  ],
  [
    {
      icon: List,
      label: "Bullet list",
      isActive: (e) => e.isActive("bulletList"),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      icon: ListOrdered,
      label: "Numbered list",
      isActive: (e) => e.isActive("orderedList"),
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: ListChecks,
      label: "Checklist",
      isActive: (e) => e.isActive("taskList"),
      run: (e) => e.chain().focus().toggleTaskList().run(),
    },
    {
      icon: Quote,
      label: "Quote",
      isActive: (e) => e.isActive("blockquote"),
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    {
      icon: Minus,
      label: "Divider",
      run: (e) => e.chain().focus().setHorizontalRule().run(),
    },
    {
      icon: TableIcon,
      label: "Insert table",
      // Tables can't nest.
      isDisabled: (e) => e.isActive("table"),
      run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
  ],
];

/**
 * Undo/redo are driven by Yjs's collaborative history (the StarterKit's own
 * history plugin is disabled when Collaboration is active), so they correctly
 * undo only *this* user's edits rather than a collaborator's.
 */
const HISTORY: ToolbarItem[] = [
  {
    icon: Undo2,
    label: "Undo",
    shortcut: "Ctrl+Z",
    isDisabled: (e) => !e.can().undo(),
    run: (e) => e.chain().focus().undo().run(),
  },
  {
    icon: Redo2,
    label: "Redo",
    shortcut: "Ctrl+Shift+Z",
    isDisabled: (e) => !e.can().redo(),
    run: (e) => e.chain().focus().redo().run(),
  },
];

/** Shown only while the caret is inside a table. */
const TABLE_ACTIONS: { label: string; run: (e: Editor) => void; danger?: boolean }[] = [
  { label: "+ Row", run: (e) => e.chain().focus().addRowAfter().run() },
  { label: "+ Column", run: (e) => e.chain().focus().addColumnAfter().run() },
  { label: "− Row", run: (e) => e.chain().focus().deleteRow().run() },
  { label: "− Column", run: (e) => e.chain().focus().deleteColumn().run() },
  { label: "Delete table", run: (e) => e.chain().focus().deleteTable().run(), danger: true },
];

/**
 * Subscribes to the editor's transaction stream.
 *
 * TipTap mutates one Editor instance rather than replacing it, so React has no
 * reason to re-render when the selection moves. Without this the active states
 * on the toolbar buttons would go stale the moment the cursor moves.
 */
function useEditorState(editor: Editor | null): number {
  return useSyncExternalStore(
    (onChange) => {
      if (!editor) return () => {};
      editor.on("transaction", onChange);
      editor.on("selectionUpdate", onChange);
      return () => {
        editor.off("transaction", onChange);
        editor.off("selectionUpdate", onChange);
      };
    },
    () =>
      editor
        ? editor.state.doc.nodeSize + editor.state.selection.from * 7 + editor.state.selection.to
        : 0,
    () => 0,
  );
}

export function EditorToolbar({
  editor,
  autocomplete,
}: {
  editor: Editor | null;
  /** Present only when AI is available; toggles inline AI autocomplete. */
  autocomplete?: { enabled: boolean; onToggle: () => void };
}) {
  useEditorState(editor);

  if (!editor) {
    // Reserve the toolbar's height so the editor doesn't jump on mount.
    return <div className="border-border h-11 border-b print:hidden" aria-hidden />;
  }

  const inTable = editor.isActive("table");

  return (
    <div className="border-border border-b print:hidden">
      <div
        className="flex flex-wrap items-center gap-0.5 px-1.5 py-1.5"
        role="toolbar"
        aria-label="Text formatting"
      >
        {GROUPS.map((group, index) => (
          <div key={index} className="flex items-center gap-0.5">
            {index > 0 && <span className="bg-border mx-1 h-5 w-px" aria-hidden />}
            {group.map((item) => (
              <ToolbarButton key={item.label} editor={editor} item={item} />
            ))}
            {index === 0 && <LinkButton editor={editor} />}
          </div>
        ))}

        <div className="flex flex-1 items-center justify-end gap-0.5">
          {autocomplete && (
            <>
              <Tooltip
                content={
                  autocomplete.enabled
                    ? "AI autocomplete is on — pause typing for a suggestion, Tab to accept"
                    : "Turn on AI autocomplete"
                }
              >
                <button
                  type="button"
                  onClick={autocomplete.onToggle}
                  aria-label="AI autocomplete"
                  aria-pressed={autocomplete.enabled}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                    autocomplete.enabled
                      ? "bg-primary-subtle text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <WandSparkles className="size-4" />
                  <span className="hidden xl:inline">Autocomplete</span>
                </button>
              </Tooltip>
              <span className="bg-border mx-1 h-5 w-px" aria-hidden />
            </>
          )}
          {HISTORY.map((item) => (
            <ToolbarButton key={item.label} editor={editor} item={item} />
          ))}
        </div>
      </div>

      {inTable && (
        <div
          className="border-border bg-muted/40 flex flex-wrap items-center gap-1 border-t px-2 py-1"
          role="toolbar"
          aria-label="Table"
        >
          <span className="text-muted-foreground mr-1 text-[11px] font-medium">Table</span>
          {TABLE_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => action.run(editor)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                action.danger
                  ? "text-danger hover:bg-danger-subtle"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ editor, item }: { editor: Editor; item: ToolbarItem }) {
  const active = item.isActive?.(editor) ?? false;
  const disabled = item.isDisabled?.(editor) ?? false;
  const Icon = item.icon;

  return (
    <Tooltip content={item.shortcut ? `${item.label} · ${item.shortcut}` : item.label}>
      <button
        type="button"
        onClick={() => item.run(editor)}
        disabled={disabled}
        aria-label={item.label}
        aria-pressed={item.isActive ? active : undefined}
        className={cn(
          "flex size-8 items-center justify-center rounded-md transition-colors",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
          "disabled:pointer-events-none disabled:opacity-40",
          active
            ? "bg-primary-subtle text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-4" />
      </button>
    </Tooltip>
  );
}

/** Accepts http(s) and mailto only; adds https:// to bare domains. */
function normaliseUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value)
    ? value
    : value.includes("@") && !value.includes("/")
      ? `mailto:${value}`
      : `https://${value}`;
  try {
    const url = new URL(candidate);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function LinkButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const active = editor.isActive("link");
  const current = editor.getAttributes("link").href as string | undefined;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setValue(current ?? "");
      setError(null);
    }
  }

  function apply(event: FormEvent) {
    event.preventDefault();
    const href = normaliseUrl(value);
    if (!href) {
      setError("Enter a valid web address (http, https or mailto).");
      return;
    }
    const chain = editor.chain().focus().extendMarkRange("link");
    // With nothing selected, insert the URL itself as the link text.
    if (editor.state.selection.empty && !active) {
      chain
        .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
        .run();
    } else {
      chain.setLink({ href }).run();
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip content="Link">
        <PopoverTrigger
          aria-label="Link"
          aria-pressed={active}
          className={cn(
            "flex size-8 items-center justify-center rounded-md transition-colors",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            active
              ? "bg-primary-subtle text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Link2 className="size-4" />
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent className="w-80">
        <form onSubmit={apply} className="space-y-2">
          <Input
            autoFocus
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            placeholder="https://example.com"
            aria-label="Link address"
            aria-invalid={Boolean(error)}
            className="h-8 text-xs"
          />
          {error && <p className="text-danger text-[11px]">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {active && current && (
                <Button asChild variant="ghost" size="sm">
                  <a href={current} target="_blank" rel="noopener noreferrer nofollow">
                    <ExternalLink />
                    Open
                  </a>
                </Button>
              )}
              {active && (
                <Button
                  type="button"
                  variant="danger-ghost"
                  size="sm"
                  onClick={() => {
                    editor.chain().focus().extendMarkRange("link").unsetLink().run();
                    setOpen(false);
                  }}
                >
                  <Link2Off />
                  Remove
                </Button>
              )}
            </div>
            <Button type="submit" size="sm">
              {active ? "Update" : "Add link"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
