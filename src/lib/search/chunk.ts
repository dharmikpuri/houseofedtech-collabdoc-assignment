/**
 * Splits document text into overlapping passages for embedding.
 *
 * Paragraph boundaries are respected where possible (a passage about one
 * topic embeds better than one cut mid-thought); very long paragraphs fall
 * back to word windows. A small overlap carries context across boundaries so
 * a fact split between two passages is still retrievable.
 */

const CHUNK_SIZE = 900;
const OVERLAP = 150;
/** Bounds indexing cost for any single document (~180k characters). */
const MAX_CHUNKS = 200;

export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n{1,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const pieces: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= CHUNK_SIZE) {
      pieces.push(paragraph);
      continue;
    }
    // Word windows for oversized paragraphs.
    const words = paragraph.split(" ");
    let current = "";
    for (const word of words) {
      if (current && current.length + word.length + 1 > CHUNK_SIZE) {
        pieces.push(current);
        current = "";
      }
      current = current ? `${current} ${word}` : word.slice(0, CHUNK_SIZE);
    }
    if (current) pieces.push(current);
  }

  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (current && current.length + piece.length + 1 > CHUNK_SIZE) {
      chunks.push(current);
      if (chunks.length >= MAX_CHUNKS) return chunks;
      current = `${overlapTail(current)}${piece}`;
    } else {
      current = current ? `${current}\n${piece}` : piece;
    }
  }
  if (current && chunks.length < MAX_CHUNKS) chunks.push(current);
  return chunks;
}

/** The last ~OVERLAP characters of a passage, cut at a word boundary. */
function overlapTail(passage: string): string {
  if (passage.length <= OVERLAP) return "";
  const tail = passage.slice(-OVERLAP);
  const space = tail.indexOf(" ");
  return space === -1 ? "" : `…${tail.slice(space + 1)}\n`;
}
