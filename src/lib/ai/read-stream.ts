"use client";

import type { StreamEvent } from "@/lib/ai/stream-response";

export type StreamOutcome = {
  text: string;
  /** True when the user pressed Stop; `text` holds what arrived until then. */
  stopped: boolean;
  error?: string;
};

/**
 * POSTs to a streaming AI endpoint and reports progress as tokens arrive.
 *
 * Handles every way a stream can end — completion, an error event, a non-2xx
 * response before streaming started, a dropped connection, and a user abort —
 * and always resolves (never throws), so callers render one consistent state.
 */
export async function streamAi(
  url: string,
  body: unknown,
  handlers: {
    signal?: AbortSignal;
    onText?: (fullText: string) => void;
    onSources?: (sources: Extract<StreamEvent, { type: "sources" }>["sources"]) => void;
  } = {},
): Promise<StreamOutcome> {
  let text = "";
  let res: Response;

  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: handlers.signal,
    });
  } catch {
    if (handlers.signal?.aborted) return { text, stopped: true };
    return {
      text,
      stopped: false,
      error: "You appear to be offline. AI features need a connection.",
    };
  }

  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return {
      text,
      stopped: false,
      error: data.error ?? "The AI service is unavailable right now.",
    };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  const handle = (line: string): StreamOutcome | null => {
    if (!line.trim()) return null;
    let event: StreamEvent;
    try {
      event = JSON.parse(line) as StreamEvent;
    } catch {
      return null;
    }
    if (event.type === "text") {
      text += event.text;
      handlers.onText?.(text);
    } else if (event.type === "sources") {
      handlers.onSources?.(event.sources);
    } else if (event.type === "error") {
      return { text, stopped: false, error: event.error };
    } else if (event.type === "done") {
      finished = true;
    }
    return null;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const result = handle(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        if (result) return result;
      }
    }
    const tail = handle(buffer);
    if (tail) return tail;
  } catch {
    if (handlers.signal?.aborted) return { text, stopped: true };
    return { text, stopped: false, error: "The connection dropped before the answer finished." };
  }

  if (handlers.signal?.aborted) return { text, stopped: true };
  if (!finished) {
    return { text, stopped: false, error: "The answer was cut off. Try again." };
  }
  return { text, stopped: false };
}
