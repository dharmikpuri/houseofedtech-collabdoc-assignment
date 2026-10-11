import { withUser } from "@/lib/db";
import { getAiProvider } from "@/lib/ai/gemini";

/**
 * Semantic search over the caller's documents.
 *
 * Tenant isolation is explicit in the query — every passage is joined to a
 * permission row for the caller — with RLS on `document_chunks` as the
 * backstop. A document you can't open can never appear in results or feed an
 * AI answer.
 */

export type ChunkHit = { documentId: string; title: string; content: string; score: number };

export type SearchResult = {
  documentId: string;
  title: string;
  snippet: string;
  /** Cosine similarity of the best passage, 0–1 (null for title-only matches). */
  score: number | null;
};

const toVectorLiteral = (vector: number[]) => `[${vector.join(",")}]`;

/** Passages below this similarity are noise, not answers. */
const MIN_SCORE = 0.35;

export async function retrieveChunks(
  userId: string,
  query: string,
  limit = 12,
): Promise<ChunkHit[]> {
  const provider = getAiProvider();
  if (!provider) return [];

  const [vector] = await provider.embed([query], "query");
  if (!vector) return [];
  const literal = toVectorLiteral(vector);

  const rows = await withUser(
    userId,
    (tx) =>
      tx.$queryRaw<{ documentId: string; title: string; content: string; score: number }[]>`
      SELECT c."documentId", d."title", c."content",
             1 - (c."embedding" <=> ${literal}::vector) AS score
      FROM "document_chunks" c
      JOIN "documents" d ON d."id" = c."documentId"
      JOIN "document_permissions" p ON p."documentId" = c."documentId" AND p."userId" = ${userId}
      WHERE d."deletedAt" IS NULL AND c."embedding" IS NOT NULL
      ORDER BY c."embedding" <=> ${literal}::vector
      LIMIT ${Math.min(Math.max(limit, 1), 50)}
    `,
  );

  return rows
    .map((row) => ({ ...row, score: Number(row.score) }))
    .filter((row) => Number.isFinite(row.score) && row.score >= MIN_SCORE);
}

/**
 * Search results, one per document: its best-matching passage, plus
 * documents whose *title* matches even if they aren't indexed yet — so search
 * is never worse than a plain title filter.
 */
export async function searchDocuments(userId: string, query: string): Promise<SearchResult[]> {
  const [hits, titleMatches] = await Promise.all([
    retrieveChunks(userId, query, 30).catch(() => [] as ChunkHit[]),
    withUser(userId, (tx) =>
      tx.document.findMany({
        where: {
          deletedAt: null,
          permissions: { some: { userId } },
          title: { contains: query, mode: "insensitive" },
        },
        select: { id: true, title: true },
        take: 10,
      }),
    ),
  ]);

  const byDocument = new Map<string, SearchResult>();
  for (const hit of hits) {
    if (byDocument.has(hit.documentId)) continue;
    byDocument.set(hit.documentId, {
      documentId: hit.documentId,
      title: hit.title,
      snippet: hit.content.length > 240 ? `${hit.content.slice(0, 239)}…` : hit.content,
      score: hit.score,
    });
  }
  for (const doc of titleMatches) {
    if (!byDocument.has(doc.id)) {
      byDocument.set(doc.id, { documentId: doc.id, title: doc.title, snippet: "", score: null });
    }
  }

  return [...byDocument.values()].slice(0, 12);
}
