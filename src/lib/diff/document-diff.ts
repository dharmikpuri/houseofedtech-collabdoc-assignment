import { diffSequences } from "@/lib/diff/myers";

/**
 * Structural comparison of two TipTap/ProseMirror documents.
 *
 * Two passes, which is how a person reads a redline:
 *  1. Align the documents block by block (paragraphs, headings, list items), so
 *     a moved or inserted paragraph doesn't make every following line "changed".
 *  2. For blocks that were edited in place, diff their words, so a one-word fix
 *     shows as one word, not a deleted and re-added paragraph.
 *
 * Pure and dependency-free, so it can run anywhere (and be unit-tested).
 */

export type BlockType = "heading" | "paragraph" | "list" | "quote" | "code" | "rule";

export type Block = {
  type: BlockType;
  text: string;
  /** Heading level (1–6). */
  level?: number;
  /** For list items. */
  ordered?: boolean;
  depth?: number;
  /** For checklist items: whether the box is ticked. */
  checked?: boolean;
};

export type Segment = { type: "equal" | "insert" | "delete"; text: string };

export type DiffRow =
  | { kind: "same"; block: Block }
  | { kind: "added"; block: Block }
  | { kind: "removed"; block: Block }
  | { kind: "changed"; before: Block; after: Block; segments: Segment[] };

export type DocumentDiff = {
  rows: DiffRow[];
  stats: { wordsAdded: number; wordsRemoved: number; blocksChanged: number };
  /** True when a size cap forced a coarser comparison somewhere. */
  approximate: boolean;
};

type PmNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
};

const TEXTBLOCKS = new Set(["paragraph", "heading", "codeBlock"]);

/** Flattens TipTap JSON into a list of comparable blocks. */
function extractBlocks(doc: unknown): Block[] {
  const blocks: Block[] = [];

  const inlineText = (node: PmNode): string => {
    if (typeof node.text === "string") return node.text;
    if (node.type === "hardBreak") return "\n";
    return (node.content ?? []).map(inlineText).join("");
  };

  const walk = (
    node: PmNode | undefined,
    context: {
      list?: { ordered: boolean; depth: number; checked?: boolean };
      quote?: boolean;
    },
  ) => {
    if (!node || typeof node !== "object") return;

    if (node.type === "horizontalRule") {
      blocks.push({ type: "rule", text: "" });
      return;
    }

    if (node.type && TEXTBLOCKS.has(node.type)) {
      const text = inlineText(node);
      // Empty paragraphs are layout, not content — they'd only add noise.
      if (!text.trim()) return;

      if (node.type === "codeBlock") blocks.push({ type: "code", text });
      else if (node.type === "heading") {
        const level = Number(node.attrs?.level ?? 1);
        blocks.push({ type: "heading", text, level: level >= 1 && level <= 6 ? level : 1 });
      } else if (context.list) {
        blocks.push({ type: "list", text, ...context.list });
      } else if (context.quote) {
        blocks.push({ type: "quote", text });
      } else {
        blocks.push({ type: "paragraph", text });
      }
      return;
    }

    let next = context;
    if (node.type === "bulletList" || node.type === "orderedList" || node.type === "taskList") {
      next = {
        ...context,
        list: {
          ordered: node.type === "orderedList",
          depth: context.list ? context.list.depth + 1 : 0,
        },
      };
    } else if (node.type === "taskItem" && context.list) {
      next = { ...context, list: { ...context.list, checked: Boolean(node.attrs?.checked) } };
    } else if (node.type === "blockquote") {
      next = { ...context, quote: true };
    }

    for (const child of node.content ?? []) walk(child, next);
  };

  walk(doc as PmNode, {});
  return blocks;
}

const blockKey = (block: Block) =>
  `${block.type}|${block.level ?? ""}|${block.ordered ?? ""}|${block.depth ?? ""}|${block.checked ?? ""}|${block.text}`;

/** Words and the whitespace between them, so re-joining is lossless. */
const tokenize = (text: string) => text.split(/(\s+)/).filter(Boolean);

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** Caps keep a pathological document from freezing the tab. */
const BLOCK_DIFF_CELLS = 4_000_000;
const WORD_DIFF_CELLS = 1_000_000;

export function diffDocuments(before: unknown, after: unknown): DocumentDiff {
  const a = extractBlocks(before);
  const b = extractBlocks(after);
  let approximate = false;

  const blockOps =
    diffSequences(a, b, (x, y) => blockKey(x) === blockKey(y), BLOCK_DIFF_CELLS) ??
    (() => {
      // Too many scattered edits to align precisely: fall back to comparing the
      // documents as one removed and one added run. Still correct, just coarse.
      approximate = true;
      return [
        ...(a.length ? [{ type: "delete" as const, items: a }] : []),
        ...(b.length ? [{ type: "insert" as const, items: b }] : []),
      ];
    })();

  const rows: DiffRow[] = [];
  const stats = { wordsAdded: 0, wordsRemoved: 0, blocksChanged: 0 };

  for (let index = 0; index < blockOps.length; index += 1) {
    const op = blockOps[index]!;

    if (op.type === "equal") {
      for (const block of op.items) rows.push({ kind: "same", block });
      continue;
    }

    // A deletion immediately followed by an insertion is an in-place edit:
    // pair the blocks up and diff their words.
    const next = blockOps[index + 1];
    if (op.type === "delete" && next?.type === "insert") {
      const removed = op.items;
      const added = next.items;
      const pairs = Math.min(removed.length, added.length);

      for (let p = 0; p < pairs; p += 1) {
        const beforeBlock = removed[p]!;
        const afterBlock = added[p]!;
        const segments = diffWords(beforeBlock.text, afterBlock.text);
        if (segments) {
          rows.push({ kind: "changed", before: beforeBlock, after: afterBlock, segments });
          for (const segment of segments) {
            if (segment.type === "insert") stats.wordsAdded += countWords(segment.text);
            if (segment.type === "delete") stats.wordsRemoved += countWords(segment.text);
          }
        } else {
          approximate = true;
          rows.push({ kind: "removed", block: beforeBlock });
          rows.push({ kind: "added", block: afterBlock });
          stats.wordsRemoved += countWords(beforeBlock.text);
          stats.wordsAdded += countWords(afterBlock.text);
        }
        stats.blocksChanged += 1;
      }

      for (const block of removed.slice(pairs)) {
        rows.push({ kind: "removed", block });
        stats.wordsRemoved += countWords(block.text);
        stats.blocksChanged += 1;
      }
      for (const block of added.slice(pairs)) {
        rows.push({ kind: "added", block });
        stats.wordsAdded += countWords(block.text);
        stats.blocksChanged += 1;
      }

      index += 1;
      continue;
    }

    for (const block of op.items) {
      rows.push({ kind: op.type === "delete" ? "removed" : "added", block });
      if (op.type === "delete") stats.wordsRemoved += countWords(block.text);
      else stats.wordsAdded += countWords(block.text);
      stats.blocksChanged += 1;
    }
  }

  return { rows, stats, approximate };
}

function diffWords(before: string, after: string): Segment[] | null {
  const ops = diffSequences(tokenize(before), tokenize(after), (x, y) => x === y, WORD_DIFF_CELLS);
  if (!ops) return null;
  return ops.map((op) => ({ type: op.type, text: op.items.join("") }));
}
