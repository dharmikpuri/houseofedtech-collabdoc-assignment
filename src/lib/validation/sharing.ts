import { z } from "zod";

export const shareableRoles = ["EDITOR", "VIEWER"] as const;

export const shareDocumentSchema = z.object({
  email: z.email("Enter a valid email address"),
  role: z.enum(shareableRoles),
});

export type ShareDocumentInput = z.infer<typeof shareDocumentSchema>;
