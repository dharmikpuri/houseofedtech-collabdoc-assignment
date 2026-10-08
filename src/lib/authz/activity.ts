import { withUser } from "@/lib/db";

export type ActivityView = {
  id: string;
  type: string;
  actorId: string;
  actorName: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

const PAGE_SIZE = 30;

/**
 * A page of a document's activity, newest first. `before` is the createdAt of
 * the last item already shown; the next page starts strictly after it.
 */
export async function listActivity(
  userId: string,
  documentId: string,
  before?: string,
): Promise<{ items: ActivityView[]; hasMore: boolean }> {
  return withUser(userId, async (tx) => {
    const rows = await tx.documentActivity.findMany({
      where: { documentId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      include: { actor: { select: { name: true, email: true } } },
    });

    const page = rows.slice(0, PAGE_SIZE);
    return {
      hasMore: rows.length > PAGE_SIZE,
      items: page.map((row) => ({
        id: row.id,
        type: row.type,
        actorId: row.actorId,
        actorName: row.actor.name ?? row.actor.email.split("@")[0] ?? "Someone",
        meta:
          row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
            ? (row.meta as Record<string, unknown>)
            : null,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });
}
