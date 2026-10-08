import { z } from "zod";

// Title bounds are enforced everywhere a title is set so the DB never receives
// an empty or unbounded string.
const title = z.string().trim().min(1, "Title is required").max(200, "Title is too long");

export const renameDocumentSchema = z.object({
  title,
});
