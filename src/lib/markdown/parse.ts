/**
 * Markdown → TipTap/ProseMirror JSON, for importing documents.
 *
 * A pragmatic CommonMark/GFM subset matching what the editor supports:
 * ATX headings, paragraphs (with hard breaks), emphasis, strong, strike,
 * inline code, links, fenced code blocks, block quotes, bullet/numbered/task
 * lists (nested by indentation), dividers and pipe tables. Anything else is
 * kept as plain text rather than dropped.
 *
 * Guarantees the output is valid for the editor's schema: no empty text nodes,
 * list items and table cells always start with a paragraph, and only
 * http(s)/mailto links survive. Every loop consumes at least one line, so no
 * input can make it spin.
 */

type Mark = { type: string; attrs?: Record<string, unknown> };
export type PmJson = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: PmJson[];
  marks?: Mark[];
};

export function parseMarkdown(markdown: string): PmJson {
  const lines = markdown.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
  const content = parseBlocks(lines);
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

/** First heading's text, if any — a sensible document title for an import. */
export function firstHeading(markdown: string): string | null {
  const match = markdown.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/m);
  return match
    ? match[1]!
        .replace(/[*_`~]/g, "")
        .trim()
        .slice(0, 200) || null
    : null;
}

// ── Blocks ───────────────────────────────────────────────────────────────────

const FENCE = /^\s{0,3}(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^\s{0,3}>/;
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

const isBlank = (line: string) => line.trim() === "";
const indentOf = (line: string) => line.length - line.trimStart().length;

function isBlockStart(line: string): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    RULE.test(line) ||
    QUOTE.test(line) ||
    LIST_ITEM.test(line)
  );
}

function parseBlocks(lines: string[]): PmJson[] {
  const out: PmJson[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (isBlank(line)) {
      i += 1;
      continue;
    }

    const fence = line.match(FENCE);
    if (fence) {
      const marker = fence[1]!;
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i]!.trim().startsWith(marker)) {
        body.push(lines[i]!);
        i += 1;
      }
      i += 1; // closing fence (or end of input)
      const code = body.join("\n");
      out.push({
        type: "codeBlock",
        attrs: { language: fence[2] || null },
        ...(code ? { content: [{ type: "text", text: code }] } : {}),
      });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      out.push(
        withContent(
          { type: "heading", attrs: { level: heading[1]!.length } },
          parseInline(heading[2]!),
        ),
      );
      i += 1;
      continue;
    }

    // Checked before lists: "- - -" is a divider, not a list (as in CommonMark).
    if (RULE.test(line)) {
      out.push({ type: "horizontalRule" });
      i += 1;
      continue;
    }

    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i]!)) {
        body.push(lines[i]!.replace(/^\s{0,3}>\s?/, ""));
        i += 1;
      }
      const inner = parseBlocks(body);
      out.push({ type: "blockquote", content: inner.length ? inner : [{ type: "paragraph" }] });
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1]!)) {
      const { node, next } = parseTable(lines, i);
      out.push(node);
      i = next;
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const { node, next } = parseList(lines, i);
      out.push(node);
      i = Math.max(next, i + 1);
      continue;
    }

    // Paragraph: consecutive lines up to a blank line or another block.
    const paragraph: string[] = [line];
    i += 1;
    while (i < lines.length && !isBlank(lines[i]!) && !isBlockStart(lines[i]!)) {
      paragraph.push(lines[i]!);
      i += 1;
    }
    out.push(withContent({ type: "paragraph" }, parseParagraphLines(paragraph)));
  }

  return out;
}

type ListLine = {
  indent: number;
  ordered: boolean;
  start: number;
  task: boolean | null;
  text: string;
  markerWidth: number;
};

function readListLine(line: string): ListLine | null {
  const match = line.match(LIST_ITEM);
  if (!match) return null;
  const marker = match[2]!;
  const ordered = /\d/.test(marker);
  let text = match[3]!;
  let task: boolean | null = null;
  if (!ordered) {
    const taskMatch = text.match(/^\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      task = taskMatch[1] !== " ";
      text = taskMatch[2]!;
    }
  }
  return {
    indent: match[1]!.length,
    ordered,
    start: ordered ? Number.parseInt(marker, 10) || 1 : 1,
    task,
    text,
    markerWidth: marker.length + 1,
  };
}

function parseList(lines: string[], from: number): { node: PmJson; next: number } {
  const first = readListLine(lines[from]!)!;
  const base = first.indent;
  const isTask = first.task !== null;
  const items: { blocks: PmJson[]; checked: boolean }[] = [];
  let i = from;

  while (i < lines.length) {
    const line = lines[i]!;

    if (isBlank(line)) {
      // A blank line continues the list only if more of it follows.
      let j = i + 1;
      while (j < lines.length && isBlank(lines[j]!)) j += 1;
      const after = j < lines.length ? lines[j]! : null;
      if (after && (indentOf(after) > base || readListLine(after)?.indent === base)) {
        i = j;
        continue;
      }
      break;
    }

    const item = readListLine(line);
    if (!item || item.indent < base) break;
    // Same level but a different kind of list starts a new list.
    if (
      item.indent <= base + 1 &&
      (item.ordered !== first.ordered || (item.task !== null) !== isTask)
    ) {
      break;
    }
    if (item.indent > base + 1) {
      // Only reachable with inconsistent indentation; treat as text.
      i += 1;
      continue;
    }

    const body: string[] = [item.text];
    const childIndent = item.indent + item.markerWidth;
    i += 1;

    while (i < lines.length) {
      const next = lines[i]!;
      if (isBlank(next)) {
        let j = i + 1;
        while (j < lines.length && isBlank(lines[j]!)) j += 1;
        if (
          j < lines.length &&
          indentOf(lines[j]!) > base &&
          !(readListLine(lines[j]!)?.indent === base)
        ) {
          body.push("");
          i += 1;
          continue;
        }
        break;
      }
      const nested = readListLine(next);
      if (nested && nested.indent <= base + 1) break;
      if (indentOf(next) > base) {
        body.push(next.slice(Math.min(indentOf(next), childIndent)));
        i += 1;
        continue;
      }
      if (isBlockStart(next)) break;
      // Lazy continuation of the item's paragraph.
      body.push(next.trim());
      i += 1;
    }

    items.push({ blocks: parseBlocks(body), checked: item.task === true });
  }

  const listItem = (blocks: PmJson[]) =>
    blocks[0]?.type === "paragraph" ? blocks : [{ type: "paragraph" }, ...blocks];

  if (isTask) {
    return {
      next: i,
      node: {
        type: "taskList",
        content: items.map((item) => ({
          type: "taskItem",
          attrs: { checked: item.checked },
          content: listItem(item.blocks),
        })),
      },
    };
  }

  return {
    next: i,
    node: {
      type: first.ordered ? "orderedList" : "bulletList",
      ...(first.ordered ? { attrs: { start: first.start } } : {}),
      content: items.map((item) => ({ type: "listItem", content: listItem(item.blocks) })),
    },
  };
}

function splitRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|") && !row.endsWith("\\|")) row = row.slice(0, -1);
  return row.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function parseTable(lines: string[], from: number): { node: PmJson; next: number } {
  const header = splitRow(lines[from]!);
  const width = header.length;
  const rows: string[][] = [];
  let i = from + 2;
  while (i < lines.length && !isBlank(lines[i]!) && lines[i]!.includes("|")) {
    rows.push(splitRow(lines[i]!));
    i += 1;
  }

  const cell = (type: "tableHeader" | "tableCell", text: string): PmJson => ({
    type,
    content: [withContent({ type: "paragraph" }, parseInline(text))],
  });
  const row = (cells: string[], type: "tableHeader" | "tableCell"): PmJson => ({
    type: "tableRow",
    content: Array.from({ length: width }, (_, index) => cell(type, cells[index] ?? "")),
  });

  return {
    next: i,
    node: {
      type: "table",
      content: [row(header, "tableHeader"), ...rows.map((cells) => row(cells, "tableCell"))],
    },
  };
}

// ── Inline ───────────────────────────────────────────────────────────────────

const SAFE_HREF = /^(https?:\/\/|mailto:)/i;
const ESCAPABLE = /[\\`*_{}[\]()#+\-.!|~>]/;

function withContent(node: PmJson, content: PmJson[]): PmJson {
  return content.length ? { ...node, content } : node;
}

function text(value: string, marks: Mark[]): PmJson | null {
  if (!value) return null;
  return marks.length
    ? { type: "text", text: value, marks: marks.map((mark) => ({ ...mark })) }
    : { type: "text", text: value };
}

function parseParagraphLines(lines: string[]): PmJson[] {
  const out: PmJson[] = [];
  lines.forEach((raw, index) => {
    const hardBreak = /( {2,}|\\)$/.test(raw);
    const line = raw.replace(/( {2,}|\\)$/, "").trim();
    out.push(...parseInline(line));
    if (index < lines.length - 1) {
      out.push(hardBreak ? { type: "hardBreak" } : { type: "text", text: " " });
    }
  });
  return out;
}

const isWordChar = (char: string | undefined) => !!char && /[A-Za-z0-9]/.test(char);

function parseInline(source: string, marks: Mark[] = []): PmJson[] {
  const out: PmJson[] = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    const node = text(buffer, marks);
    if (node) out.push(node);
    buffer = "";
  };

  while (i < source.length) {
    const char = source[i]!;

    // Backslash escape.
    if (char === "\\" && i + 1 < source.length && ESCAPABLE.test(source[i + 1]!)) {
      buffer += source[i + 1];
      i += 2;
      continue;
    }

    // Inline code: `x` or ``x``.
    if (char === "`") {
      const ticks = source.startsWith("``", i) ? "``" : "`";
      const end = source.indexOf(ticks, i + ticks.length);
      if (end > i) {
        flush();
        const code = source.slice(i + ticks.length, end).trim();
        const node = text(code, [...marks, { type: "code" }]);
        if (node) out.push(node);
        i = end + ticks.length;
        continue;
      }
    }

    // Autolink: <https://…>
    if (char === "<") {
      const match = source.slice(i).match(/^<((?:https?:\/\/|mailto:)[^\s>]+)>/i);
      if (match) {
        flush();
        const node = text(match[1]!, [...marks, { type: "link", attrs: { href: match[1] } }]);
        if (node) out.push(node);
        i += match[0].length;
        continue;
      }
    }

    // Link [text](href) or image ![alt](src) — images become links to the source.
    if (char === "[" || (char === "!" && source[i + 1] === "[")) {
      const offset = char === "!" ? 1 : 0;
      const match = source
        .slice(i + offset)
        .match(/^\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/);
      if (match) {
        flush();
        const label = match[1] || match[2]!;
        const href = match[2]!;
        out.push(
          ...(SAFE_HREF.test(href)
            ? parseInline(label, [...marks, { type: "link", attrs: { href } }])
            : parseInline(label, marks)),
        );
        i += offset + match[0].length;
        continue;
      }
    }

    // Emphasis: ** __ ~~ * _
    const delimiter = ["**", "__", "~~", "*", "_"].find((d) => source.startsWith(d, i));
    if (delimiter) {
      const underscore = delimiter[0] === "_";
      // Intra-word underscores (snake_case) are literal text.
      const opensOk =
        !/\s/.test(source[i + delimiter.length] ?? " ") &&
        !(underscore && isWordChar(source[i - 1]));
      if (opensOk) {
        let close = source.indexOf(delimiter, i + delimiter.length);
        while (close !== -1) {
          const closesOk =
            !/\s/.test(source[close - 1] ?? " ") &&
            !(underscore && isWordChar(source[close + delimiter.length])) &&
            // A single * must not be the first half of a **.
            !(delimiter.length === 1 && source[close + 1] === delimiter);
          if (closesOk) break;
          close = source.indexOf(delimiter, close + 1);
        }
        // Require non-empty content between the delimiters.
        if (close > i + delimiter.length) {
          flush();
          const type = delimiter === "~~" ? "strike" : delimiter.length === 2 ? "bold" : "italic";
          out.push(...parseInline(source.slice(i + delimiter.length, close), [...marks, { type }]));
          i = close + delimiter.length;
          continue;
        }
      }
    }

    buffer += char;
    i += 1;
  }

  flush();
  return out;
}
