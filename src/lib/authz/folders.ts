import { withUser } from "@/lib/db";
import { MAX_FOLDERS_PER_USER } from "@/lib/validation/workspace";

/**
 * Personal folders. Every query is scoped by `userId` in the WHERE clause as
 * well as by RLS, so one user can never see, rename or file into another's
 * folder even if they guess its id.
 */

export type FolderSummary = { id: string; name: string; documentCount: number };

export async function listFolders(userId: string): Promise<FolderSummary[]> {
  return withUser(userId, async (tx) => {
    const folders = await tx.folder.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            // Only count documents that still exist and are still shared with
            // the user — a revoked or deleted document shouldn't inflate it.
            documents: {
              where: {
                document: { deletedAt: null, permissions: { some: { userId } } },
              },
            },
          },
        },
      },
    });
    return folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      documentCount: folder._count.documents,
    }));
  });
}

type CreateResult = { ok: true; folder: FolderSummary } | { ok: false; reason: "limit" };

export async function createFolder(userId: string, name: string): Promise<CreateResult> {
  return withUser(userId, async (tx) => {
    const count = await tx.folder.count({ where: { userId } });
    if (count >= MAX_FOLDERS_PER_USER) return { ok: false, reason: "limit" };

    const folder = await tx.folder.create({
      data: { userId, name: name.trim() },
      select: { id: true, name: true },
    });
    return { ok: true, folder: { ...folder, documentCount: 0 } };
  });
}

export async function renameFolder(userId: string, folderId: string, name: string) {
  return withUser(userId, async (tx) => {
    const result = await tx.folder.updateMany({
      where: { id: folderId, userId },
      data: { name: name.trim() },
    });
    return result.count > 0;
  });
}

/** Deletes a folder. Its documents are un-filed (ON DELETE SET NULL), not deleted. */
export async function deleteFolder(userId: string, folderId: string) {
  return withUser(userId, async (tx) => {
    const result = await tx.folder.deleteMany({ where: { id: folderId, userId } });
    return result.count > 0;
  });
}
