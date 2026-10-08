import { withUser } from "@/lib/db";
import { can, type Role } from "@/lib/authz/roles";
import { recordActivity } from "@/lib/activity/record";

/**
 * The single gateway for reading and mutating documents.
 *
 * Every function runs through `withUser`, which scopes the work to the caller
 * under Postgres row-level security. There is deliberately no "fetch document
 * by id" that skips this — tenant isolation is enforced in the database, with
 * these checks as the application-layer complement.
 */

export type DocumentWithRole = {
  id: string;
  title: string;
  updatedAt: Date;
  role: Role;
  /** The caller's personal organisation of this document. */
  favorite: boolean;
  folderId: string | null;
  lastOpenedAt: Date | null;
  /** Shared tags on the document. */
  tags: string[];
};

export async function listDocuments(userId: string): Promise<DocumentWithRole[]> {
  return withUser(userId, async (tx) => {
    const permissions = await tx.documentPermission.findMany({
      where: { userId, document: { deletedAt: null } },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            updatedAt: true,
            userMeta: {
              where: { userId },
              select: { favorite: true, folderId: true, lastOpenedAt: true },
            },
            tags: { select: { tag: true }, orderBy: { tag: "asc" } },
          },
        },
      },
      orderBy: { document: { updatedAt: "desc" } },
    });

    return permissions.map((permission) => {
      const meta = permission.document.userMeta[0];
      return {
        id: permission.document.id,
        title: permission.document.title,
        updatedAt: permission.document.updatedAt,
        role: permission.role,
        favorite: meta?.favorite ?? false,
        folderId: meta?.folderId ?? null,
        lastOpenedAt: meta?.lastOpenedAt ?? null,
        tags: permission.document.tags.map((row) => row.tag),
      };
    });
  });
}

export async function getDocumentAccess(
  userId: string,
  documentId: string,
): Promise<{ id: string; title: string; role: Role } | null> {
  return withUser(userId, async (tx) => {
    const permission = await tx.documentPermission.findUnique({
      where: { documentId_userId: { documentId, userId } },
      include: { document: true },
    });

    if (!permission || permission.document.deletedAt) return null;

    return {
      id: permission.document.id,
      title: permission.document.title,
      role: permission.role,
    };
  });
}

export async function createDocument(
  userId: string,
  title?: string,
  source: "blank" | "import" = "blank",
) {
  return withUser(userId, async (tx) => {
    const document = await tx.document.create({
      data: {
        title: title?.trim() || "Untitled",
        ownerId: userId,
        permissions: { create: { userId, role: "OWNER" } },
      },
      select: { id: true },
    });
    await recordActivity(tx, {
      documentId: document.id,
      actorId: userId,
      type: source === "import" ? "document.imported" : "document.created",
    });
    return document;
  });
}

type MutationResult = { ok: true } | { ok: false; reason: "not_found" | "forbidden" };

export async function deleteDocument(userId: string, documentId: string): Promise<MutationResult> {
  return withUser(userId, async (tx) => {
    const permission = await tx.documentPermission.findUnique({
      where: { documentId_userId: { documentId, userId } },
      include: { document: { select: { deletedAt: true } } },
    });
    if (!permission || permission.document.deletedAt) return { ok: false, reason: "not_found" };
    if (!can(permission.role, "deleteDocument")) return { ok: false, reason: "forbidden" };

    await tx.document.update({ where: { id: documentId }, data: { deletedAt: new Date() } });
    return { ok: true };
  });
}

export async function renameDocument(
  userId: string,
  documentId: string,
  title: string,
): Promise<MutationResult> {
  return withUser(userId, async (tx) => {
    const permission = await tx.documentPermission.findUnique({
      where: { documentId_userId: { documentId, userId } },
      include: { document: { select: { deletedAt: true, title: true } } },
    });
    if (!permission || permission.document.deletedAt) return { ok: false, reason: "not_found" };
    if (!can(permission.role, "edit")) return { ok: false, reason: "forbidden" };

    const next = title.trim();
    // Replays of a queued rename are idempotent: no write, no duplicate log line.
    if (permission.document.title === next) return { ok: true };

    await tx.document.update({ where: { id: documentId }, data: { title: next } });
    await recordActivity(tx, {
      documentId,
      actorId: userId,
      type: "document.renamed",
      meta: { from: permission.document.title, to: next },
    });
    return { ok: true };
  });
}

// ── Personal organisation (favourites, folders, recents) ─────────────────────

type MetaResult = { ok: true } | { ok: false; reason: "not_found" | "folder_not_found" };

/**
 * Sets the caller's favourite flag and/or folder for a document. Only touches
 * the caller's own metadata row — it never affects how anyone else sees it.
 */
export async function setDocumentMeta(
  userId: string,
  documentId: string,
  patch: { favorite?: boolean; folderId?: string | null },
): Promise<MetaResult> {
  return withUser(userId, async (tx) => {
    const permission = await tx.documentPermission.findUnique({
      where: { documentId_userId: { documentId, userId } },
      include: { document: { select: { deletedAt: true } } },
    });
    if (!permission || permission.document.deletedAt) return { ok: false, reason: "not_found" };

    if (patch.folderId) {
      // A folder id from the client must belong to the caller.
      const folder = await tx.folder.findFirst({
        where: { id: patch.folderId, userId },
        select: { id: true },
      });
      if (!folder) return { ok: false, reason: "folder_not_found" };
    }

    const data = {
      ...(patch.favorite !== undefined ? { favorite: patch.favorite } : {}),
      ...(patch.folderId !== undefined ? { folderId: patch.folderId } : {}),
    };

    await tx.userDocumentMeta.upsert({
      where: { userId_documentId: { userId, documentId } },
      create: { userId, documentId, ...data },
      update: data,
    });
    return { ok: true };
  });
}

/** Records that the caller opened a document, for the "Recent" view. */
export async function touchDocument(userId: string, documentId: string): Promise<void> {
  await withUser(userId, (tx) =>
    tx.userDocumentMeta.upsert({
      where: { userId_documentId: { userId, documentId } },
      create: { userId, documentId, lastOpenedAt: new Date() },
      update: { lastOpenedAt: new Date() },
    }),
  );
}
