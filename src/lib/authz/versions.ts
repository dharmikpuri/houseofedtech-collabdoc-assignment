import { Prisma } from "@/generated/prisma";
import { withUser } from "@/lib/db";
import { recordActivity } from "@/lib/activity/record";

export type VersionSummary = {
  id: string;
  label: string;
  authorName: string;
  createdAt: Date;
};

export async function listVersions(userId: string, documentId: string): Promise<VersionSummary[]> {
  return withUser(userId, async (tx) => {
    const versions = await tx.version.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true, email: true } } },
    });

    return versions.map((version) => ({
      id: version.id,
      label: version.label,
      authorName: version.author.name ?? version.author.email,
      createdAt: version.createdAt,
    }));
  });
}

export async function getVersionContent(userId: string, documentId: string, versionId: string) {
  return withUser(userId, (tx) =>
    tx.version.findFirst({
      where: { id: versionId, documentId },
      select: { content: true },
    }),
  );
}

/** Oldest capture time we accept from a client before falling back to "now". */
const MAX_CAPTURE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Turns a client-reported capture time into a trustworthy `createdAt`.
 *
 * Clocks drift and clients can lie, so the value is only honoured inside a
 * sane window: never in the future, never older than 30 days. Anything else
 * falls back to the server's clock.
 */
function resolveCreatedAt(capturedAt: string | undefined): Date | undefined {
  if (!capturedAt) return undefined;
  const at = new Date(capturedAt);
  const now = Date.now();
  if (Number.isNaN(at.getTime())) return undefined;
  if (at.getTime() > now) return new Date(now);
  if (now - at.getTime() > MAX_CAPTURE_AGE_MS) return undefined;
  return at;
}

export type CreateVersionResult =
  { ok: true; id: string; replayed: boolean } | { ok: false; reason: "conflict" | "limit" };

/**
 * Snapshots per document. Each can be up to 1 MB, so an unbounded history is
 * an unbounded table; at this ceiling the user is asked to prune rather than
 * the database silently growing forever.
 */
export const MAX_VERSIONS_PER_DOCUMENT = 500;

class VersionLimitError extends Error {}

/**
 * Creates a snapshot. When a `clientMutationId` is supplied the operation is
 * idempotent: delivering the same queued mutation twice — a retry after a lost
 * response, or two tabs flushing the same outbox — returns the original row.
 *
 * Two concurrent deliveries can both miss the pre-check and race to insert; the
 * unique index decides the winner and the loser re-reads it. The failed insert
 * aborts its own transaction, which is why the re-read runs in a fresh one.
 */
export async function createVersion(input: {
  documentId: string;
  authorId: string;
  label: string;
  content: Prisma.InputJsonValue;
  clientMutationId?: string;
  capturedAt?: string;
  /** Set when this snapshot is the backup taken just before a restore. */
  restoreOf?: string;
}): Promise<CreateVersionResult> {
  const { documentId, authorId, clientMutationId } = input;

  const findExisting = (key: string) =>
    withUser(authorId, (tx) =>
      tx.version.findUnique({
        where: { documentId_clientMutationId: { documentId, clientMutationId: key } },
        select: { id: true, authorId: true },
      }),
    );

  // A key belongs to the user who minted it. Another user presenting the same
  // key is not a replay, so it must not be answered with someone else's row.
  const asReplay = (existing: { id: string; authorId: string }): CreateVersionResult =>
    existing.authorId === authorId
      ? { ok: true, id: existing.id, replayed: true }
      : { ok: false, reason: "conflict" };

  // Only queued deliveries carry a key; direct saves skip the lookup entirely.
  if (clientMutationId) {
    const existing = await findExisting(clientMutationId);
    if (existing) return asReplay(existing);
  }

  try {
    const created = await withUser(authorId, async (tx) => {
      const existingCount = await tx.version.count({ where: { documentId } });
      if (existingCount >= MAX_VERSIONS_PER_DOCUMENT) throw new VersionLimitError();

      const version = await tx.version.create({
        data: {
          documentId,
          authorId,
          label: input.label,
          content: input.content,
          clientMutationId: clientMutationId ?? null,
          createdAt: resolveCreatedAt(input.capturedAt),
        },
        select: { id: true },
      });

      // The restore target is looked up inside the same document, so a
      // client can't make the feed name a version from somewhere else.
      const restored = input.restoreOf
        ? await tx.version.findFirst({
            where: { id: input.restoreOf, documentId },
            select: { id: true, label: true },
          })
        : null;

      await recordActivity(tx, {
        documentId,
        actorId: authorId,
        ...(restored
          ? {
              type: "version.restored" as const,
              meta: { versionId: restored.id, label: restored.label },
            }
          : {
              type: "version.created" as const,
              meta: { versionId: version.id, label: input.label },
            }),
      });
      return version;
    });
    return { ok: true, id: created.id, replayed: false };
  } catch (error) {
    if (error instanceof VersionLimitError) return { ok: false, reason: "limit" };
    if (
      clientMutationId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const winner = await findExisting(clientMutationId);
      if (winner) return asReplay(winner);
    }
    throw error;
  }
}
