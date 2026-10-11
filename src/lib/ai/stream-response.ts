import { aiErrorMessage } from "@/lib/ai/provider";

/**
 * Newline-delimited JSON events streamed to the client.
 *
 * NDJSON rather than raw text so that (a) metadata such as retrieval sources
 * can travel alongside the tokens, and (b) a failure *after* the 200 status
 * has been sent still reaches the client as an explicit error event instead of
 * a silently truncated answer.
 */
export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "sources"; sources: { n: number; documentId: string; title: string }[] }
  | { type: "error"; error: string }
  | { type: "done" };

/** Hard ceiling on any streamed answer, regardless of the model. */
const STREAM_TIMEOUT_MS = 60_000;

export function ndjsonStream(
  request: Request,
  run: (send: (event: StreamEvent) => void, signal: AbortSignal) => Promise<void>,
): Response {
  const controller = new AbortController();
  // Client disconnects ("Stop", closed tab) and the timeout both cancel the
  // upstream model call, so abandoned answers stop costing tokens.
  const onAbort = () => controller.abort();
  request.signal.addEventListener("abort", onAbort);
  const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(sink) {
      const send = (event: StreamEvent) => {
        if (controller.signal.aborted && event.type !== "error") return;
        try {
          sink.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // The consumer went away; nothing left to deliver to.
        }
      };

      try {
        await run(send, controller.signal);
        send({ type: "done" });
      } catch (error) {
        if (!controller.signal.aborted) send({ type: "error", error: aiErrorMessage(error) });
      } finally {
        clearTimeout(timeout);
        request.signal.removeEventListener("abort", onAbort);
        try {
          sink.close();
        } catch {
          // Already closed by a cancel.
        }
      }
    },
    cancel() {
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      // Disable proxy buffering so tokens reach the browser as they arrive.
      "X-Accel-Buffering": "no",
    },
  });
}
