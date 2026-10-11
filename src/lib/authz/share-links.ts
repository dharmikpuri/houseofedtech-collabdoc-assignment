import { createHash, randomBytes } from "node:crypto";

import { prisma, withUser } from "@/lib/db";
import type { Role } from "@/lib/authz/roles";
import { recordActivity } from "@/lib/activity/record";

/**
 * Invite links.
 *
 * Security model:
 *  - The token is 32 bytes from the CSPRNG (256 bits), so it can't be guessed.
 *  - Only its SHA-256 is stored. A database leak doesn't hand out working
 *    invitations, and the raw token is shown to the owner exactly once.
 *  - Links grant EDITOR or VIEWER, never OWNER, and can expire or be revoked.
 *  - Redeeming never *downgrades* an existing member: an editor opening a
 *    viewer link stays an editor.
 *  - Redemption is an explicit POST (a "Join" button), never a side effect of
 *    visiting the URL, so link previews and prefetching can't join anyone.
 */

const EXPIRY_MS: Record<"1d" | "7d" | "30d", number> = {
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const MAX_ACTIVE_LINKS = 20;

const RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type ShareLinkView = {
  id: string;
  role: Role;
  expiresAt: string | null;
  useCount: number;
  createdAt: string;
};

const toView = (link: {
  id: string;
  role: Role;
  expiresAt: Date | null;
  useCount: number;
  createdAt: Date;
}): ShareLinkView => ({
  id: link.id,
  role: link.role,
  expiresAt: link.expiresAt?.toISOString() ?? null,
  useCount: link.useCount,
  createdAt: link.createdAt.toISOString(),
});

export async function listShareLinks(
  actorId: string,
  documentId: string,
): Promise<ShareLinkView[]> {
  return withUser(actorId, async (tx) => {
    const links = await tx.shareLink.findMany({
      where: {
        documentId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
    });
    return links.map(toView);
  });
}

type CreateLinkResult =
  { ok: true; token: string; link: ShareLinkView } | { ok: false; reason: "limit" };

export async function createShareLink(input: {
  actorId: string;
  documentId: string;
  role: Extract<Role, "EDITOR" | "VIEWER">;
  expiresIn: "1d" | "7d" | "30d" | "never";
}): Promise<CreateLinkResult> {
  return withUser(input.actorId, async (tx) => {
    const active = await tx.shareLink.count({
      where: {
        documentId: input.documentId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (active >= MAX_ACTIVE_LINKS) return { ok: false, reason: "limit" };

    const token = randomBytes(32).toString("base64url");
    const expiresAt =
      input.expiresIn === "never" ? null : new Date(Date.now() + EXPIRY_MS[input.expiresIn]);

    const link = await tx.shareLink.create({
      data: {
        documentId: input.documentId,
        tokenHash: hashToken(token),
        role: input.role,
        createdById: input.actorId,
        expiresAt,
      },
    });

    await recordActivity(tx, {
      documentId: input.documentId,
      actorId: input.actorId,
      type: "link.created",
      meta: { role: input.role, expiresIn: input.expiresIn },
    });

    return { ok: true, token, link: toView(link) };
  });
}

export async function revokeShareLink(input: {
  actorId: string;
  documentId: string;
  linkId: string;
}): Promise<boolean> {
  return withUser(input.actorId, async (tx) => {
    const result = await tx.shareLink.updateMany({
      where: { id: input.linkId, documentId: input.documentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) return false;
    await recordActivity(tx, {
      documentId: input.documentId,
      actorId: input.actorId,
      type: "link.revoked",
    });
    return true;
  });
}

export type LinkPreview =
  | {
      status: "valid";
      documentId: string;
      documentTitle: string;
      inviterName: string;
      role: Role;
      /** The visitor's current role, if they are already a member. */
      currentRole: Role | null;
    }
  | { status: "invalid" | "expired" | "revoked" };

/**
 * Looks a token up for the invite page. Runs on the owner connection (not
 * `withUser`): the visitor has no access to the document yet, which is the
 * whole point — the token hash is the only credential being checked.
 */
export async function previewShareLink(token: string, visitorId: string): Promise<LinkPreview> {
  const link = await prisma.shareLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      document: { select: { id: true, title: true, deletedAt: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!link || link.document.deletedAt) return { status: "invalid" };
  if (link.revokedAt) return { status: "revoked" };
  if (link.expiresAt && link.expiresAt <= new Date()) return { status: "expired" };

  const membership = await prisma.documentPermission.findUnique({
    where: { documentId_userId: { documentId: link.documentId, userId: visitorId } },
    select: { role: true },
  });

  return {
    status: "valid",
    documentId: link.document.id,
    documentTitle: link.document.title,
    inviterName: link.createdBy.name ?? link.createdBy.email.split("@")[0] ?? "Someone",
    role: link.role,
    currentRole: membership?.role ?? null,
  };
}

export type RedeemResult =
  { ok: true; documentId: string } | { ok: false; reason: "invalid" | "expired" | "revoked" };

export async function redeemShareLink(token: string, userId: string): Promise<RedeemResult> {
  const link = await prisma.shareLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { document: { select: { deletedAt: true } } },
  });

  if (!link || link.document.deletedAt) return { ok: false, reason: "invalid" };
  if (link.revokedAt) return { ok: false, reason: "revoked" };
  if (link.expiresAt && link.expiresAt <= new Date()) return { ok: false, reason: "expired" };

  // The grant itself runs as the redeeming user, so it is written under their
  // RLS scope (the permission row is theirs).
  await withUser(userId, async (tx) => {
    const existing = await tx.documentPermission.findUnique({
      where: { documentId_userId: { documentId: link.documentId, userId } },
      select: { role: true },
    });

    // Already at or above the link's role: nothing to grant (never downgrade).
    if (existing && RANK[existing.role] >= RANK[link.role]) return;

    await tx.documentPermission.upsert({
      where: { documentId_userId: { documentId: link.documentId, userId } },
      create: { documentId: link.documentId, userId, role: link.role },
      update: { role: link.role },
    });
    await tx.shareLink.update({
      where: { id: link.id },
      data: { useCount: { increment: 1 } },
    });
    await recordActivity(tx, {
      documentId: link.documentId,
      actorId: userId,
      type: "member.joined",
      meta: { role: link.role, via: "link", ...(existing ? { from: existing.role } : {}) },
    });
  });

  return { ok: true, documentId: link.documentId };
}
