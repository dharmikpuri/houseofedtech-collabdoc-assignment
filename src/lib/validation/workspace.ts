import { z } from "zod";

/**
 * Validation for the workspace features: folders, favourites, comments,
 * mentions, share links and activity. Every limit here is also a resource cap:
 * nothing a client sends is unbounded.
 */

/** Opaque ids from Prisma (cuid) or the client (UUID). */
export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "Invalid id");

// ── Documents & folders ──────────────────────────────────────────────────────

export const createDocumentBodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  source: z.enum(["blank", "import"]).optional(),
});

const folderNameSchema = z
  .string()
  .trim()
  .min(1, "Folder name is required")
  .max(60, "Folder name is too long");

export const createFolderSchema = z.object({ name: folderNameSchema });
export const renameFolderSchema = z.object({ name: folderNameSchema });

export const MAX_FOLDERS_PER_USER = 100;

export const documentMetaSchema = z
  .object({
    favorite: z.boolean().optional(),
    // null un-files the document.
    folderId: idSchema.nullable().optional(),
  })
  .refine((value) => value.favorite !== undefined || value.folderId !== undefined, {
    message: "Nothing to update",
  });

// ── Comments ─────────────────────────────────────────────────────────────────

const MAX_COMMENT_LENGTH = 2_000;
const MAX_QUOTE_LENGTH = 500;
const MAX_MENTIONS = 20;

const commentBody = z
  .string()
  .trim()
  .min(1, "Write a comment first.")
  .max(MAX_COMMENT_LENGTH, "Comments are limited to 2,000 characters.");

const mentions = z.array(idSchema).max(MAX_MENTIONS).default([]);

export const createThreadSchema = z.object({
  // Minted by the client so the anchor mark can be applied to the selection
  // immediately, before the request round-trips.
  threadId: idSchema,
  quote: z.string().trim().min(1).max(MAX_QUOTE_LENGTH),
  body: commentBody,
  mentions,
});

export const replySchema = z.object({ body: commentBody, mentions });

export const resolveThreadSchema = z.object({ resolved: z.boolean() });

// ── Share links ──────────────────────────────────────────────────────────────

const shareLinkExpiry = ["1d", "7d", "30d", "never"] as const;

export const createShareLinkSchema = z.object({
  role: z.enum(["EDITOR", "VIEWER"]),
  expiresIn: z.enum(shareLinkExpiry),
});

/** Raw tokens are 32 random bytes, base64url-encoded (43 chars). */
export const shareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Invalid link");

// ── Activity & notifications ─────────────────────────────────────────────────

export const activityCursorSchema = z.iso.datetime().optional();

export const markNotificationsReadSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(idSchema).min(1).max(100) }),
]);
