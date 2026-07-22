import { withUser } from "@/lib/db";
import type { Role } from "@/lib/authz/roles";

export type Collaborator = {
  userId: string;
  name: string;
  email: string;
  role: Role;
};

export async function listCollaborators(
  actorId: string,
  documentId: string,
): Promise<Collaborator[]> {
  return withUser(actorId, async (tx) => {
    const permissions = await tx.documentPermission.findMany({
      where: { documentId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });

    return permissions.map((permission) => ({
      userId: permission.user.id,
      name: permission.user.name ?? permission.user.email,
      email: permission.user.email,
      role: permission.role,
    }));
  });
}

type ShareResult =
  | { ok: true; collaborator: Collaborator }
  | { ok: false; reason: "user_not_found" | "already_owner" };

export async function shareDocument(input: {
  actorId: string;
  documentId: string;
  email: string;
  role: Extract<Role, "EDITOR" | "VIEWER">;
}): Promise<ShareResult> {
  return withUser(input.actorId, async (tx) => {
    const user = await tx.user.findFirst({
      where: { email: { equals: input.email.trim(), mode: "insensitive" } },
      select: { id: true, name: true, email: true },
    });
    if (!user) return { ok: false, reason: "user_not_found" };

    const existing = await tx.documentPermission.findUnique({
      where: { documentId_userId: { documentId: input.documentId, userId: user.id } },
      select: { role: true },
    });
    if (existing?.role === "OWNER") return { ok: false, reason: "already_owner" };

    const permission = await tx.documentPermission.upsert({
      where: { documentId_userId: { documentId: input.documentId, userId: user.id } },
      create: { documentId: input.documentId, userId: user.id, role: input.role },
      update: { role: input.role },
      select: { role: true },
    });

    return {
      ok: true,
      collaborator: {
        userId: user.id,
        name: user.name ?? user.email,
        email: user.email,
        role: permission.role,
      },
    };
  });
}

type RemoveResult = { ok: true } | { ok: false; reason: "not_found" | "cannot_remove_owner" };

export async function removeCollaborator(input: {
  actorId: string;
  documentId: string;
  userId: string;
}): Promise<RemoveResult> {
  return withUser(input.actorId, async (tx) => {
    const permission = await tx.documentPermission.findUnique({
      where: { documentId_userId: { documentId: input.documentId, userId: input.userId } },
      select: { role: true },
    });
    if (!permission) return { ok: false, reason: "not_found" };
    if (permission.role === "OWNER") return { ok: false, reason: "cannot_remove_owner" };

    await tx.documentPermission.delete({
      where: { documentId_userId: { documentId: input.documentId, userId: input.userId } },
    });
    return { ok: true };
  });
}
