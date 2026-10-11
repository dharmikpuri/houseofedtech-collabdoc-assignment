/**
 * TipTap/ProseMirror JSON → GitHub-flavoured Markdown.
 *
 * Covers everything the editor can produce: headings, paragraphs, bold,
 * italic, strike, inline code, links, hard breaks, bullet/numbered lists
 * (nested), checklists, quotes, code blocks, dividers and tables. Formatting
 * Markdown can't express (underline, highlight, comment anchors) is dropped
 * but its text is kept.
 */

type JsonMark = { type: string; attrs?: Record<string, unknown> };
type JsonNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  marks?: JsonMark[];
};

export function toMarkdown(doc: unknown): string {
  const root = doc as JsonNode;
  return serializeBlocks(root?.content ?? [])
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .concat("\n");
}

function serializeBlocks(nodes: JsonNode[]): string {
  return nodes
    .map(serializeBlock)
    .filter((block) => block !== null)
    .join("\n\n");
}

function serializeBlock(node: JsonNode): string | null {
  switch (node.type) {
    case "paragraph":
      return escapeLineStart(serializeInline(node.content ?? []));
    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6);
      return `${"#".repeat(level)} ${serializeInline(node.content ?? [])}`;
    }
    case "blockquote":
      return prefixLines(serializeBlocks(node.content ?? []), "> ", "> ");
    case "bulletList":
      return (node.content ?? []).map((item) => serializeListItem(item, "- ")).join("\n");
    case "orderedList": {
      const start = Number(node.attrs?.start ?? 1) || 1;
      return (node.content ?? [])
        .map((item, index) => serializeListItem(item, `${start + index}. `))
        .join("\n");
    }
    case "taskList":
      return (node.content ?? [])
        .map((item) => serializeListItem(item, item.attrs?.checked ? "- [x] " : "- [ ] "))
        .join("\n");
    case "codeBlock": {
      const language = typeof node.attrs?.language === "string" ? node.attrs.language : "";
      const code = (node.content ?? []).map((child) => child.text ?? "").join("");
      // Use a fence longer than any run of backticks inside the code.
      const longest = Math.max(2, ...(code.match(/`+/g) ?? []).map((run) => run.length));
      const fence = "`".repeat(longest + 1);
      return `${fence}${language}\n${code}\n${fence}`;
    }
    case "horizontalRule":
      return "---";
    case "table":
      return serializeTable(node);
    default:
      // Unknown container: keep its children rather than losing content.
      return node.content ? serializeBlocks(node.content) : null;
  }
}

function serializeListItem(item: JsonNode, marker: string): string {
  const body = serializeBlocks(item.content ?? []) || "";
  return prefixLines(body, marker, " ".repeat(marker.length));
}

function serializeTable(table: JsonNode): string {
  const rows = (table.content ?? []).map((row) =>
    (row.content ?? []).map((cell) =>
      (cell.content ?? [])
        .map((block) => serializeInline(block.content ?? []))
        .join(" ")
        .replace(/\|/g, "\\|")
        .replace(/\n/g, " ")
        .trim(),
    ),
  );
  if (rows.length === 0) return "";

  const width = Math.max(...rows.map((row) => row.length));
  const pad = (row: string[]) => [...row, ...Array(width - row.length).fill("")];
  const line = (cells: string[]) => `| ${pad(cells).join(" | ")} |`;

  const [header, ...body] = rows;
  return [line(header!), line(Array(width).fill("---")), ...body.map(line)].join("\n");
}

function serializeInline(nodes: JsonNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "  \n";
      if (typeof node.text !== "string") return "";

      const marks = node.marks ?? [];
      const has = (type: string) => marks.some((mark) => mark.type === type);

      if (has("code")) {
        const ticks = node.text.includes("`") ? "``" : "`";
        return `${ticks}${node.text}${ticks}`;
      }

      let text = escapeInline(node.text);
      if (has("bold")) text = `**${text}**`;
      if (has("italic")) text = `*${text}*`;
      if (has("strike")) text = `~~${text}~~`;

      const link = marks.find((mark) => mark.type === "link");
      const href = typeof link?.attrs?.href === "string" ? link.attrs.href : null;
      if (href) text = `[${text}](${href.replace(/\)/g, "%29").replace(/\s/g, "%20")})`;

      return text;
    })
    .join("");
}

function escapeInline(text: string): string {
  return text.replace(/([\\`*_[\]<~])/g, "\\$1");
}

/** A paragraph that happens to start like a block marker must not become one. */
function escapeLineStart(text: string): string {
  return text.replace(/^(\s*)(#{1,6}\s|>|[-+*]\s|\d+[.)]\s|---\s*$)/, "$1\\$2");
}

function prefixLines(text: string, first: string, rest: string): string {
  return text
    .split("\n")
    .map((line, index) => (index === 0 ? first : line.length ? rest : rest.trimEnd()) + line)
    .join("\n");
}
