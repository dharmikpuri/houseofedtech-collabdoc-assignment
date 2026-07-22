import { z } from "zod";

export const MAX_SUMMARY_CONTENT_BYTES = 1_000_000;

export const summaryRequestSchema = z.object({
  currentContent: z
    .unknown()
    .refine(
      (value) => JSON.stringify(value ?? null).length <= MAX_SUMMARY_CONTENT_BYTES,
      "Document is too large to summarise",
    ),
});
