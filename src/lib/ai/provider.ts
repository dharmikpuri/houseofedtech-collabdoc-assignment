/**
 * AI provider abstraction.
 *
 * Every AI feature in the app talks to this interface, never to a vendor SDK
 * directly. Swapping Gemini for OpenAI/Groq/a local model is then a matter of
 * writing one adapter and changing `getAiProvider` — no route handler or React
 * component has to change.
 *
 * The interface is deliberately text-in/text-out: the prompts live in
 * `src/lib/ai/tasks.ts` so they can be reviewed and tuned in one place, and so
 * a provider swap can't silently change behaviour.
 */

export type AiMessage = {
  role: "user" | "system";
  content: string;
};

export type AiCompletionOptions = {
  /** Upper bound on response length; providers map this to their own units. */
  maxOutputTokens?: number;
  /** 0 = deterministic. Summarisation and extraction stay low. */
  temperature?: number;
  /** Lets a caller abort when the user navigates away or cancels. */
  signal?: AbortSignal;
};

/** Embedding vectors are stored at this width (see the pgvector column). */
export const EMBEDDING_DIMENSIONS = 768;

export type EmbeddingTask = "document" | "query";

export interface AiProvider {
  /** Stable identifier, surfaced in logs and the UI's "powered by" note. */
  readonly id: string;
  /** Human-readable model name for display. */
  readonly model: string;
  complete(messages: AiMessage[], options?: AiCompletionOptions): Promise<string>;
  /**
   * Streams the completion as text fragments. Aborting `options.signal`
   * cancels the upstream request, so a user pressing "Stop" also stops the
   * token spend.
   */
  stream(messages: AiMessage[], options?: AiCompletionOptions): AsyncGenerator<string>;
  /**
   * Embeds texts as EMBEDDING_DIMENSIONS-wide vectors. `task` lets providers
   * that distinguish them embed stored passages and search queries
   * asymmetrically, which improves retrieval.
   */
  embed(texts: string[], task: EmbeddingTask, signal?: AbortSignal): Promise<number[][]>;
}

/**
 * Error type every provider throws, so callers can map failures to HTTP status
 * codes and user-facing copy without matching on vendor-specific shapes.
 */
export class AiError extends Error {
  constructor(
    message: string,
    readonly kind: "not_configured" | "rate_limited" | "upstream" | "empty_response" | "aborted",
    readonly status?: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}

/** Maps an AiError to the HTTP status an API route should return. */
export function aiErrorStatus(error: unknown): number {
  if (!(error instanceof AiError)) return 502;
  switch (error.kind) {
    case "not_configured":
      return 503;
    case "rate_limited":
      return 429;
    case "aborted":
      return 499;
    default:
      return 502;
  }
}

/** User-safe message for an AI failure — never leaks provider internals. */
export function aiErrorMessage(error: unknown): string {
  if (!(error instanceof AiError)) return "The AI service is unavailable right now.";
  switch (error.kind) {
    case "not_configured":
      return "AI features aren't configured on this deployment.";
    case "rate_limited":
      return "Too many AI requests right now. Please try again in a moment.";
    case "empty_response":
      return "The AI returned an empty response. Try again.";
    case "aborted":
      return "The request was cancelled.";
    default:
      return "The AI service is unavailable right now. Please try again.";
  }
}
