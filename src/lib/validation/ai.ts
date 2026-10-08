import { z } from "zod";

import { MAX_TAGS } from "@/lib/tags";

/**
 * Validation for the AI endpoints.
 *
 * The same byte ceiling as version snapshots applies to document content: an
 * oversized body is rejected by `checkBodySize` before it is buffered, and this
 * schema is the second line of defence once parsed. Both matter — the header
 * can lie, and a chunked request has no `content-length` at all.
 */
export const MAX_AI_CONTENT_BYTES = 1_000_000;
const MAX_QUESTION_LENGTH = 500;
const MAX_SELECTION_LENGTH = 8_000;

const documentContent = z
  .unknown()
  .refine(
    (value) => JSON.stringify(value ?? null).length <= MAX_AI_CONTENT_BYTES,
    "This document is too large to analyse.",
  );

export const documentTaskSchema = z.object({
  content: documentContent,
  task: z.enum(["summary", "action-items", "key-insights"]),
});

export const askDocumentSchema = z.object({
  content: documentContent,
  question: z
    .string()
    .trim()
    .min(1, "Enter a question.")
    .max(MAX_QUESTION_LENGTH, "That question is too long."),
});

export const rewriteSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Select some text first.")
    .max(MAX_SELECTION_LENGTH, "Select a shorter passage (up to 8,000 characters)."),
  mode: z.enum(["improve", "shorten", "bulletize"]),
});

/** Autocomplete sees only the text just before the caret — enough for context, cheap to send. */
const MAX_COMPLETION_CONTEXT = 4_000;

export const completeSchema = z.object({
  before: z.string().min(1).max(MAX_COMPLETION_CONTEXT),
});

/** Title / tag suggestions and client-side indexing all send the document. */
export const documentContentSchema = z.object({ content: documentContent });

export const setTagsSchema = z.object({
  tags: z.array(z.string().max(40)).max(MAX_TAGS),
});

export const searchSchema = z.object({
  query: z.string().trim().min(1, "Type something to search for.").max(300),
});

export const workspaceAskSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Enter a question.")
    .max(MAX_QUESTION_LENGTH, "That question is too long."),
});

export type DocumentTaskInput = z.infer<typeof documentTaskSchema>;
export type AskDocumentInput = z.infer<typeof askDocumentSchema>;
export type RewriteInput = z.infer<typeof rewriteSchema>;
