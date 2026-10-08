import * as Y from "yjs";

/**
 * Extracts plain text from a stored Yjs document state.
 *
 * The collaboration server persists the merged CRDT state; decoding it here
 * lets the server index a document's authoritative content without any client
 * involved. Only text is read — no editor or schema is needed.
 */

const BLOCKS = new Set([
  "paragraph",
  "heading",
  "codeBlock",
  "blockquote",
  "listItem",
  "taskItem",
  "tableRow",
  "horizontalRule",
]);

/** TipTap's Collaboration extension stores content in this fragment. */
const FIELD = "default";

export function yjsStateToText(state: Uint8Array): string {
  const doc = new Y.Doc();
  try {
    Y.applyUpdate(doc, state);
    const out: string[] = [];
    walk(doc.getXmlFragment(FIELD), out);
    return out
      .join("")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } finally {
    doc.destroy();
  }
}

function walk(node: Y.XmlFragment | Y.XmlElement | Y.XmlText, out: string[]) {
  if (node instanceof Y.XmlText) {
    for (const op of node.toDelta() as { insert?: unknown }[]) {
      if (typeof op.insert === "string") out.push(op.insert);
    }
    return;
  }

  for (const child of node.toArray()) {
    if (child instanceof Y.XmlText || child instanceof Y.XmlElement) walk(child, out);
  }

  if (node instanceof Y.XmlElement) {
    if (node.nodeName === "tableCell" || node.nodeName === "tableHeader") out.push(" | ");
    else if (BLOCKS.has(node.nodeName)) out.push("\n");
  }
}
