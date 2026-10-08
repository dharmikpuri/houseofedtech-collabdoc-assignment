import { withUser } from "@/lib/db";

export type NotificationView = {
  id: string;
  type: "mention" | "share";
  actorName: string;
  documentId: string;
  documentTitle: string;
  threadId: string | null;
  preview: string;
  read: boolean;
  createdAt: string;
};

/**
 * The caller's notifications. Filtered to documents that still exist and that
 * the caller can still open — a notification about a document you've since
 * lost access to would leak its title and lead to a 404.
 */
export async function listNotifications(
  userId: string,
): Promise<{ items: NotificationView[]; unread: number }> {
  return withUser(userId, async (tx) => {
    const visible = {
      userId,
      document: { deletedAt: null, permissions: { some: { userId } } },
    };

    const [rows, unread] = await Promise.all([
      tx.notification.findMany({
        where: visible,
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          actor: { select: { name: true, email: true } },
          document: { select: { title: true } },
        },
      }),
      tx.notification.count({ where: { ...visible, readAt: null } }),
    ]);

    return {
      unread,
      items: rows.map((row) => ({
        id: row.id,
        type: row.type === "share" ? "share" : "mention",
        actorName: row.actor.name ?? row.actor.email.split("@")[0] ?? "Someone",
        documentId: row.documentId,
        documentTitle: row.document.title,
        threadId: row.threadId,
        preview: row.preview,
        read: Boolean(row.readAt),
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });
}

/** Marks notifications read. Scoped to the caller, so foreign ids are no-ops. */
export async function markNotificationsRead(
  userId: string,
  target: { all: true } | { ids: string[] },
): Promise<number> {
  return withUser(userId, async (tx) => {
    const result = await tx.notification.updateMany({
      where: {
        userId,
        readAt: null,
        ...("ids" in target ? { id: { in: target.ids } } : {}),
      },
      data: { readAt: new Date() },
    });
    return result.count;
  });
}
