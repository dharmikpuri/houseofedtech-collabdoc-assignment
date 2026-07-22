import { withUser } from "@/lib/db";
import { can, type Role } from "@/lib/authz/roles";

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
};

export async function listDocuments(userId: string): Promise<DocumentWithRole[]> {
  return withUser(userId, async (tx) => {
    const permissions = await tx.documentPermission.findMany({
      where: { userId, document: { deletedAt: null } },
      include: { document: true },
      orderBy: { document: { updatedAt: "desc" } },
    });

    return permissions.map((permission) => ({
      id: permission.document.id,
      title: permission.document.title,
      updatedAt: permission.document.updatedAt,
      role: permission.role,
    }));
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

export async function createDocument(userId: string, title?: string) {
  return withUser(userId, (tx) =>
    tx.document.create({
      data: {
        title: title?.trim() || "Untitled",
        ownerId: userId,
        permissions: { create: { userId, role: "OWNER" } },
      },
      select: { id: true },
    }),
  );
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
      include: { document: { select: { deletedAt: true } } },
    });
    if (!permission || permission.document.deletedAt) return { ok: false, reason: "not_found" };
    if (!can(permission.role, "edit")) return { ok: false, reason: "forbidden" };

    await tx.document.update({ where: { id: documentId }, data: { title: title.trim() } });
    return { ok: true };
  });
}
