import { withUser } from "@/lib/db";
import { can } from "@/lib/authz/roles";
import { recordActivity } from "@/lib/activity/record";
import { MAX_TAGS, normaliseTag } from "@/lib/tags";

/**
 * Document tags. Shared by all collaborators (they describe the document, not
 * one person's filing), so changing them needs the `edit` capability.
 */

export async function listTags(userId: string, documentId: string): Promise<string[]> {
  return withUser(userId, async (tx) => {
    const rows = await tx.documentTag.findMany({
      where: { documentId },
      orderBy: { tag: "asc" },
      select: { tag: true },
    });
    return rows.map((row) => row.tag);
  });
}

type SetTagsResult =
  { ok: true; tags: string[] } | { ok: false; reason: "not_found" | "forbidden" };

/** Replaces the document's tag set (normalised, de-duplicated, capped). */
export async function setTags(
  userId: string,
  documentId: string,
  input: string[],
): Promise<SetTagsResult> {
  const tags = [...new Set(input.map(normaliseTag).filter((tag) => tag.length >= 2))].slice(
    0,
    MAX_TAGS,
  );

  return withUser(userId, async (tx) => {
    const permission = await tx.documentPermission.findUnique({
      where: { documentId_userId: { documentId, userId } },
      include: { document: { select: { deletedAt: true } } },
    });
    if (!permission || permission.document.deletedAt) return { ok: false, reason: "not_found" };
    if (!can(permission.role, "edit")) return { ok: false, reason: "forbidden" };

    const current = (
      await tx.documentTag.findMany({ where: { documentId }, select: { tag: true } })
    ).map((row) => row.tag);

    const added = tags.filter((tag) => !current.includes(tag));
    const removed = current.filter((tag) => !tags.includes(tag));
    if (added.length === 0 && removed.length === 0) return { ok: true, tags: [...current].sort() };

    if (removed.length) {
      await tx.documentTag.deleteMany({ where: { documentId, tag: { in: removed } } });
    }
    if (added.length) {
      await tx.documentTag.createMany({
        data: added.map((tag) => ({ documentId, tag })),
        skipDuplicates: true,
      });
    }
    await recordActivity(tx, {
      documentId,
      actorId: userId,
      type: "document.tagged",
      meta: { added, removed },
    });
    return { ok: true, tags: [...tags].sort() };
  });
}
