import { Mark, mergeAttributes, type Editor } from "@tiptap/react";
import type { Node as PmNode } from "@tiptap/pm/model";

/**
 * Anchors a comment thread to a span of text.
 *
 * The mark lives inside the Yjs document, so the anchor travels with the text
 * through concurrent edits and offline merges exactly like any other
 * formatting. Only the thread id is stored here; the conversation itself is in
 * Postgres, where it can be authorised and queried.
 *
 * `excludes: ""` lets several threads overlap on the same text, and
 * `inclusive: false` stops typing at the edge of an anchor from extending it.
 * Styling is applied from outside (see CommentHighlights) so resolved or
 * unknown threads don't render a highlight.
 */
export const CommentMark = Mark.create({
  name: "comment",
  inclusive: false,
  excludes: "",
  spanning: true,

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-thread-id"),
        renderHTML: (attributes) =>
          attributes.threadId ? { "data-thread-id": attributes.threadId as string } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-thread-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "comment-anchor" }), 0];
  },
});

/**
 * Adds an anchor for `threadId` over [from, to].
 *
 * Uses a raw `addMark` rather than TipTap's `setMark`, which would *update* an
 * existing comment mark in the range — overwriting another thread's id.
 */
export function addCommentAnchor(editor: Editor, from: number, to: number, threadId: string) {
  const type = editor.schema.marks.comment;
  if (!type || from >= to) return false;
  return editor
    .chain()
    .command(({ tr }) => {
      tr.addMark(from, to, type.create({ threadId }));
      return true;
    })
    .run();
}

/** Removes every anchor of one thread, leaving other threads' anchors intact. */
export function removeCommentAnchor(editor: Editor, threadId: string) {
  const type = editor.schema.marks.comment;
  if (!type) return false;
  return editor
    .chain()
    .command(({ tr, state }) => {
      state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        for (const mark of node.marks) {
          if (mark.type === type && mark.attrs.threadId === threadId) {
            tr.removeMark(pos, pos + node.nodeSize, mark);
          }
        }
      });
      return true;
    })
    .run();
}

/** Every thread id anchored in the document, with the span it covers. */
export function collectCommentAnchors(doc: PmNode): Map<string, { from: number; to: number }> {
  const anchors = new Map<string, { from: number; to: number }>();
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type.name !== "comment") continue;
      const id = mark.attrs.threadId as string | null;
      if (!id) continue;
      const end = pos + node.nodeSize;
      const existing = anchors.get(id);
      anchors.set(
        id,
        existing
          ? { from: Math.min(existing.from, pos), to: Math.max(existing.to, end) }
          : { from: pos, to: end },
      );
    }
  });
  return anchors;
}

/** Thread ids of comment marks at a document position (for click-to-open). */
export function threadIdsAt(editor: Editor, pos: number): string[] {
  const $pos = editor.state.doc.resolve(pos);
  const marks = [...$pos.marks(), ...($pos.nodeAfter?.marks ?? [])];
  const ids = new Set<string>();
  for (const mark of marks) {
    if (mark.type.name === "comment" && typeof mark.attrs.threadId === "string") {
      ids.add(mark.attrs.threadId);
    }
  }
  return [...ids];
}
