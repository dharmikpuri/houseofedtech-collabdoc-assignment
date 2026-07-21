import { z } from "zod";

// Title bounds are enforced everywhere a title is set so the DB never receives
// an empty or unbounded string.
const title = z.string().trim().min(1, "Title is required").max(200, "Title is too long");

export const createDocumentSchema = z.object({
  // Optional on create — new documents default to "Untitled".
  title: title.optional(),
});

export const renameDocumentSchema = z.object({
  title,
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type RenameDocumentInput = z.infer<typeof renameDocumentSchema>;
