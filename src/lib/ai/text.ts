const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "listItem",
  "blockquote",
  "codeBlock",
  "bulletList",
  "orderedList",
  "taskList",
  "taskItem",
  "table",
  "tableRow",
]);

type Node = { type?: string; text?: string; content?: Node[] };

/** Flatten TipTap/ProseMirror JSON into plain text for comparison. */
export function extractText(content: unknown): string {
  const out: string[] = [];
  walk(content as Node, out);
  return out
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function walk(node: Node | undefined, out: string[]) {
  if (!node || typeof node !== "object") return;
  if (typeof node.text === "string") out.push(node.text);
  if (Array.isArray(node.content)) for (const child of node.content) walk(child, out);
  if (node.type && BLOCK_TYPES.has(node.type)) out.push("\n");
}
