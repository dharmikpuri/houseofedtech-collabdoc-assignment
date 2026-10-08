import { Extension, type Editor, type Range } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { exitSuggestion } from "@tiptap/suggestion";

const SLASH_KEY = new PluginKey("slashCommand");

/**
 * Slash commands: type "/" to insert a block.
 *
 * The suggestion plugin handles detection and range tracking; the menu is a
 * React component that reads from a tiny external store (below) instead of a
 * tooltip library, so it shares the app's styling and accessibility.
 */

export type SlashItem = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  group: "Text" | "Lists" | "Blocks";
  run: (editor: Editor, range: Range) => void;
};

const at = (editor: Editor, range: Range) => editor.chain().focus().deleteRange(range);

const SLASH_ITEMS: SlashItem[] = [
  {
    id: "text",
    title: "Text",
    description: "Plain paragraph",
    keywords: ["paragraph", "p", "body"],
    group: "Text",
    run: (e, r) => at(e, r).setParagraph().run(),
  },
  {
    id: "h1",
    title: "Heading 1",
    description: "Large section heading",
    keywords: ["title", "h1", "big"],
    group: "Text",
    run: (e, r) => at(e, r).setHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    title: "Heading 2",
    description: "Medium section heading",
    keywords: ["subtitle", "h2"],
    group: "Text",
    run: (e, r) => at(e, r).setHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    title: "Heading 3",
    description: "Small section heading",
    keywords: ["h3"],
    group: "Text",
    run: (e, r) => at(e, r).setHeading({ level: 3 }).run(),
  },
  {
    id: "bullet",
    title: "Bullet list",
    description: "Simple bulleted list",
    keywords: ["ul", "unordered", "points"],
    group: "Lists",
    run: (e, r) => at(e, r).toggleBulletList().run(),
  },
  {
    id: "numbered",
    title: "Numbered list",
    description: "List with numbering",
    keywords: ["ol", "ordered", "1"],
    group: "Lists",
    run: (e, r) => at(e, r).toggleOrderedList().run(),
  },
  {
    id: "todo",
    title: "Checklist",
    description: "Track tasks with checkboxes",
    keywords: ["task", "todo", "check", "checkbox"],
    group: "Lists",
    run: (e, r) => at(e, r).toggleTaskList().run(),
  },
  {
    id: "quote",
    title: "Quote",
    description: "Capture a quotation",
    keywords: ["blockquote", "citation"],
    group: "Blocks",
    run: (e, r) => at(e, r).setBlockquote().run(),
  },
  {
    id: "code",
    title: "Code block",
    description: "Monospaced code",
    keywords: ["pre", "snippet"],
    group: "Blocks",
    run: (e, r) => at(e, r).setCodeBlock().run(),
  },
  {
    id: "table",
    title: "Table",
    description: "3 × 3 table with a header row",
    keywords: ["grid", "rows", "columns"],
    group: "Blocks",
    run: (e, r) => at(e, r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: "divider",
    title: "Divider",
    description: "Horizontal separator",
    keywords: ["hr", "line", "separator"],
    group: "Blocks",
    run: (e, r) => at(e, r).setHorizontalRule().run(),
  },
];

function filterSlashItems(query: string): SlashItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(needle) ||
      item.keywords.some((keyword) => keyword.startsWith(needle)),
  );
}

// ── Menu store ───────────────────────────────────────────────────────────────

export type SlashMenuState = {
  open: boolean;
  items: SlashItem[];
  index: number;
  rect: DOMRect | null;
  select: ((item: SlashItem) => void) | null;
};

const CLOSED: SlashMenuState = { open: false, items: [], index: 0, rect: null, select: null };

let menuState: SlashMenuState = CLOSED;
const listeners = new Set<() => void>();

function setMenu(next: SlashMenuState) {
  menuState = next;
  for (const listener of listeners) listener();
}

export const slashMenuStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => menuState,
  getServerSnapshot: () => CLOSED,
  setIndex(index: number) {
    setMenu({ ...menuState, index });
  },
  close() {
    setMenu(CLOSED);
  },
};

// ── Extension ────────────────────────────────────────────────────────────────

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        pluginKey: SLASH_KEY,
        char: "/",
        allowSpaces: false,
        // Not inside code, where "/" is ordinary text (paths, comments, regex).
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          return $from.parent.type.name !== "codeBlock";
        },
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => ({
          onStart: (props) => {
            setMenu({
              open: props.items.length > 0,
              items: props.items,
              index: 0,
              rect: props.clientRect?.() ?? null,
              select: (item) => props.command(item),
            });
          },
          onUpdate: (props) => {
            setMenu({
              open: props.items.length > 0,
              items: props.items,
              index: Math.min(menuState.index, Math.max(props.items.length - 1, 0)),
              rect: props.clientRect?.() ?? null,
              select: (item) => props.command(item),
            });
          },
          onKeyDown: ({ event, view }) => {
            if (!menuState.open) return false;
            const count = menuState.items.length;
            if (event.key === "ArrowDown") {
              setMenu({ ...menuState, index: (menuState.index + 1) % count });
              return true;
            }
            if (event.key === "ArrowUp") {
              setMenu({ ...menuState, index: (menuState.index - 1 + count) % count });
              return true;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              const item = menuState.items[menuState.index];
              if (item) menuState.select?.(item);
              return true;
            }
            if (event.key === "Escape") {
              // Exit the suggestion itself, not just the menu — otherwise the
              // next keystroke would reopen it for the same "/".
              exitSuggestion(view, SLASH_KEY);
              setMenu(CLOSED);
              return true;
            }
            return false;
          },
          onExit: () => setMenu(CLOSED),
        }),
      }),
    ];
  },
});
