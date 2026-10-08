import { createHash, randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma";
import { prisma, withUser } from "@/lib/db";
import { getAiProvider } from "@/lib/ai/gemini";
import { chunkText } from "@/lib/search/chunk";
import { yjsStateToText } from "@/lib/search/yjs-text";

/**
 * Keeps each document's semantic-search index current.
 *
 * Work is skipped entirely when the document's text hash hasn't changed since
 * the last run, so re-indexing is cheap to trigger often. The embedding call
 * happens *outside* the database transaction: a slow network round-trip must
 * never hold a pooled connection.
 */

export type IndexOutcome = "indexed" | "unchanged" | "empty" | "disabled";

const toVectorLiteral = (vector: number[]) => `[${vector.join(",")}]`;

export async function indexDocumentText(
  userId: string,
  documentId: string,
  title: string,
  text: string,
): Promise<IndexOutcome> {
  const provider = getAiProvider();
  if (!provider) return "disabled";

  const normalised = text.trim();
  const contentHash = createHash("sha256").update(`${title}\n${normalised}`).digest("hex");

  const existing = await withUser(userId, (tx) =>
    tx.documentIndex.findUnique({ where: { documentId }, select: { contentHash: true } }),
  );
  if (existing?.contentHash === contentHash) {
    // Nothing changed; just record that it was checked, so it isn't seen as stale.
    await withUser(userId, (tx) =>
      tx.documentIndex.update({ where: { documentId }, data: { indexedAt: new Date() } }),
    );
    return "unchanged";
  }

  const chunks = normalised ? chunkText(normalised) : [];

  // Prefix the title so passages carry their document's context when embedded.
  const vectors = chunks.length
    ? await provider.embed(
        chunks.map((chunk) => `${title}\n\n${chunk}`),
        "document",
      )
    : [];

  await withUser(userId, async (tx) => {
    await tx.documentChunk.deleteMany({ where: { documentId } });

    if (chunks.length) {
      const rows = chunks.map(
        (content, index) =>
          Prisma.sql`(${randomUUID()}, ${documentId}, ${index}, ${content}, ${toVectorLiteral(vectors[index]!)}::vector)`,
      );
      await tx.$executeRaw`
        INSERT INTO "document_chunks" ("id", "documentId", "chunkIndex", "content", "embedding")
        VALUES ${Prisma.join(rows)}
      `;
    }

    await tx.documentIndex.upsert({
      where: { documentId },
      create: { documentId, contentHash, chunkCount: chunks.length },
      update: { contentHash, chunkCount: chunks.length, indexedAt: new Date() },
    });
  });

  return chunks.length ? "indexed" : "empty";
}

/**
 * Re-indexes documents whose stored CRDT state changed since they were last
 * indexed (or that were never indexed), reading the server's authoritative
 * copy. Bounded per call so a request never does unbounded work.
 */
export async function refreshStaleIndexes(
  userId: string,
  limit = 5,
): Promise<{ indexed: number; remaining: number }> {
  if (!getAiProvider()) return { indexed: 0, remaining: 0 };

  const candidates = await prisma.document.findMany({
    where: { deletedAt: null, permissions: { some: { userId } }, state: { isNot: null } },
    select: {
      id: true,
      title: true,
      state: { select: { updatedAt: true } },
      searchIndex: { select: { indexedAt: true } },
    },
  });

  const stale = candidates.filter(
    (doc) => !doc.searchIndex || (doc.state && doc.state.updatedAt > doc.searchIndex.indexedAt),
  );

  let indexed = 0;
  for (const doc of stale.slice(0, limit)) {
    const row = await prisma.documentState.findUnique({
      where: { documentId: doc.id },
      select: { state: true },
    });
    if (!row) continue;
    try {
      await indexDocumentText(userId, doc.id, doc.title, yjsStateToText(new Uint8Array(row.state)));
      indexed += 1;
    } catch {
      // One bad document (or a transient AI error) mustn't block the rest.
    }
  }

  return { indexed, remaining: Math.max(stale.length - indexed, 0) };
}

/** How much of the caller's workspace is searchable right now. */
export async function indexCoverage(userId: string): Promise<{ indexed: number; total: number }> {
  const [total, indexed] = await Promise.all([
    prisma.document.count({ where: { deletedAt: null, permissions: { some: { userId } } } }),
    prisma.documentIndex.count({
      where: {
        chunkCount: { gt: 0 },
        document: { deletedAt: null, permissions: { some: { userId } } },
      },
    }),
  ]);
  return { indexed, total };
}
