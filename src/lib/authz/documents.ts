import { prisma } from "@/lib/db";
import { can, type Role } from "@/lib/authz/roles";

/**
 * The single gateway for reading and mutating documents.
 *
 * Every function takes the authenticated `userId` and scopes its query to
 * documents that user has a permission row for. There is deliberately NO
 * "fetch document by id" that skips this check — that's how tenant isolation
 * is guaranteed at the application layer (Postgres RLS is layered on later).
 */

export type DocumentWithRole = {
  id: string;
  title: string;
  updatedAt: Date;
  role: Role;
};

/** Documents the user owns or has been shared, newest first. */
export async function listDocuments(userId: string): Promise<DocumentWithRole[]> {
  const permissions = await prisma.documentPermission.findMany({
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
}

/** A single document plus the caller's role, or null if they can't access it. */
export async function getDocumentAccess(
  userId: string,
  documentId: string,
): Promise<{ id: string; title: string; role: Role } | null> {
  const permission = await prisma.documentPermission.findUnique({
    where: { documentId_userId: { documentId, userId } },
    include: { document: true },
  });

  if (!permission || permission.document.deletedAt) return null;

  return {
    id: permission.document.id,
    title: permission.document.title,
    role: permission.role,
  };
}

/** Create a document and grant the creator OWNER in one atomic write. */
export async function createDocument(userId: string, title?: string) {
  return prisma.document.create({
    data: {
      title: title?.trim() || "Untitled",
      ownerId: userId,
      permissions: { create: { userId, role: "OWNER" } },
    },
    select: { id: true },
  });
}

type MutationResult = { ok: true } | { ok: false; reason: "not_found" | "forbidden" };

/** Soft-delete a document. Only a role with `deleteDocument` (Owner) may do it. */
export async function deleteDocument(userId: string, documentId: string): Promise<MutationResult> {
  const access = await getDocumentAccess(userId, documentId);
  if (!access) return { ok: false, reason: "not_found" };
  if (!can(access.role, "deleteDocument")) return { ok: false, reason: "forbidden" };

  await prisma.document.update({
    where: { id: documentId },
    data: { deletedAt: new Date() },
  });
  return { ok: true };
}
