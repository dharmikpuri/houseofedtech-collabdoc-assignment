import { z } from "zod";

export const MAX_VERSION_CONTENT_BYTES = 1_000_000;

/**
 * Client-minted idempotency key. Restricted to a conservative alphabet so it can
 * never carry anything but an opaque identifier (UUIDs match; so does the
 * fallback generator used where `crypto.randomUUID` is unavailable).
 */
const clientMutationIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "Invalid mutation id");

export const createVersionSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(120, "Label is too long"),
  content: z
    .unknown()
    .refine(
      (value) => JSON.stringify(value ?? null).length <= MAX_VERSION_CONTENT_BYTES,
      "Document is too large to snapshot",
    ),
  // Present only for snapshots delivered through the offline mutation queue.
  clientMutationId: clientMutationIdSchema.optional(),
  // When the user actually took the snapshot. A queued snapshot may reach the
  // server long after it was captured; this keeps the timeline honest. The
  // server clamps it, so a skewed or hostile clock can't reorder history.
  capturedAt: z.iso.datetime().optional(),
  // Present on the backup snapshot taken immediately before a restore, so the
  // activity feed can say "restored <version>" rather than "saved a version".
  restoreOf: z
    .string()
    .regex(/^[A-Za-z0-9_-]{8,64}$/)
    .optional(),
});

export type CreateVersionInput = z.infer<typeof createVersionSchema>;
