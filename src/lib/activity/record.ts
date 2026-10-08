import type { Prisma } from "@/generated/prisma";
import type { TxClient } from "@/lib/db";

/**
 * Activity types. Kept as a closed union (rather than a DB enum) so adding one
 * is a code change, not a migration — the column is plain text.
 */
export type ActivityType =
  | "document.created"
  | "document.imported"
  | "document.renamed"
  | "document.tagged"
  | "version.created"
  | "version.restored"
  | "member.added"
  | "member.role_changed"
  | "member.removed"
  | "member.joined"
  | "link.created"
  | "link.revoked"
  | "comment.created"
  | "comment.resolved"
  | "comment.reopened";

/**
 * Records an activity entry.
 *
 * Always called with the transaction that performs the change itself, so the
 * feed and the data can never disagree: if the change rolls back, so does its
 * log line.
 */
export function recordActivity(
  tx: TxClient,
  input: {
    documentId: string;
    actorId: string;
    type: ActivityType;
    meta?: Prisma.InputJsonValue;
  },
) {
  return tx.documentActivity.create({
    data: {
      documentId: input.documentId,
      actorId: input.actorId,
      type: input.type,
      meta: input.meta,
    },
    select: { id: true },
  });
}
