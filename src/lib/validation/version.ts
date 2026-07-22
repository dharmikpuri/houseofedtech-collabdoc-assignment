import { z } from "zod";

export const MAX_VERSION_CONTENT_BYTES = 1_000_000;

export const createVersionSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(120, "Label is too long"),
  content: z
    .unknown()
    .refine(
      (value) => JSON.stringify(value ?? null).length <= MAX_VERSION_CONTENT_BYTES,
      "Document is too large to snapshot",
    ),
});

export type CreateVersionInput = z.infer<typeof createVersionSchema>;
