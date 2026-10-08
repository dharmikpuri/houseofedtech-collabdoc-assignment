import {
  AiError,
  EMBEDDING_DIMENSIONS,
  type AiCompletionOptions,
  type AiMessage,
  type AiProvider,
  type EmbeddingTask,
} from "@/lib/ai/provider";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
/** Gemini's batch embedding endpoint accepts at most this many inputs. */
const EMBED_BATCH = 100;

/** Whether AI features should be offered at all. */
export function isAiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function aiModelName(): string {
  return process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
}

function embeddingModelName(): string {
  return process.env.GEMINI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("GEMINI_API_KEY is not set", "not_configured");
  return key;
}

/** Maps a transport failure onto the provider-neutral error kinds. */
function transportError(error: unknown): AiError {
  if (error instanceof Error && error.name === "AbortError") {
    return new AiError("Request aborted", "aborted");
  }
  return new AiError("Could not reach the AI service", "upstream");
}

function statusError(response: Response): AiError {
  if (response.status === 429) return new AiError("Gemini rate limit reached", "rate_limited", 429);
  // The upstream body can echo the API key in error paths, so it is
  // deliberately not read or logged here.
  return new AiError(`Gemini request failed (${response.status})`, "upstream", response.status);
}

type GeminiResponse = { candidates?: { content?: { parts?: { text?: string }[] } }[] };

const textOf = (data: GeminiResponse) =>
  data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";

/**
 * Google Gemini adapter.
 *
 * Uses the REST API directly rather than the SDK: the surface needed is three
 * endpoints, and avoiding the dependency keeps the serverless bundle small and
 * the provider boundary honest.
 */
class GeminiProvider implements AiProvider {
  readonly id = "gemini";

  get model(): string {
    return aiModelName();
  }

  /** Gemini takes system guidance via systemInstruction; the rest are user turns. */
  private body(messages: AiMessage[], options: AiCompletionOptions) {
    const system = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    return JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages
        .filter((message) => message.role === "user")
        .map((message) => ({ role: "user", parts: [{ text: message.content }] })),
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxOutputTokens ?? 800,
      },
    });
  }

  async complete(messages: AiMessage[], options: AiCompletionOptions = {}): Promise<string> {
    const key = apiKey();

    let response: Response;
    try {
      response = await fetch(`${ENDPOINT}/${this.model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: options.signal,
        body: this.body(messages, options),
      });
    } catch (error) {
      throw transportError(error);
    }
    if (!response.ok) throw statusError(response);

    const text = textOf((await response.json()) as GeminiResponse).trim();
    if (!text) throw new AiError("Gemini returned no content", "empty_response");
    return text;
  }

  async *stream(messages: AiMessage[], options: AiCompletionOptions = {}): AsyncGenerator<string> {
    const key = apiKey();

    let response: Response;
    try {
      response = await fetch(`${ENDPOINT}/${this.model}:streamGenerateContent?alt=sse&key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: options.signal,
        body: this.body(messages, options),
      });
    } catch (error) {
      throw transportError(error);
    }
    if (!response.ok || !response.body) throw statusError(response);

    // Server-sent events: one `data: {json}` line per chunk.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let produced = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newline: number;
        while ((newline = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const text = textOf(JSON.parse(payload) as GeminiResponse);
            if (text) {
              produced = true;
              yield text;
            }
          } catch {
            // A malformed event is skipped rather than failing the answer.
          }
        }
      }
    } catch (error) {
      throw transportError(error);
    } finally {
      reader.releaseLock();
    }

    if (!produced) throw new AiError("Gemini returned no content", "empty_response");
  }

  async embed(texts: string[], task: EmbeddingTask, signal?: AbortSignal): Promise<number[][]> {
    const key = apiKey();
    const model = embeddingModelName();
    const vectors: number[][] = [];

    for (let start = 0; start < texts.length; start += EMBED_BATCH) {
      const batch = texts.slice(start, start + EMBED_BATCH);
      let response: Response;
      try {
        response = await fetch(`${ENDPOINT}/${model}:batchEmbedContents?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            requests: batch.map((text) => ({
              model: `models/${model}`,
              content: { parts: [{ text }] },
              taskType: task === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
              outputDimensionality: EMBEDDING_DIMENSIONS,
            })),
          }),
        });
      } catch (error) {
        throw transportError(error);
      }
      if (!response.ok) throw statusError(response);

      const data = (await response.json()) as { embeddings?: { values?: number[] }[] };
      const values = (data.embeddings ?? []).map((embedding) => embedding.values ?? []);
      if (
        values.length !== batch.length ||
        values.some(
          (vector) => vector.length !== EMBEDDING_DIMENSIONS || !vector.every(Number.isFinite),
        )
      ) {
        throw new AiError("Unexpected embedding response", "empty_response");
      }
      vectors.push(...values);
    }

    return vectors;
  }
}

let cached: AiProvider | undefined;

/**
 * Returns the configured provider, or null when AI is switched off so callers
 * can degrade gracefully instead of throwing.
 */
export function getAiProvider(): AiProvider | null {
  if (!isAiEnabled()) return null;
  cached ??= new GeminiProvider();
  return cached;
}
