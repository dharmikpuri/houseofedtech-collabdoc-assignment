import { NextResponse } from "next/server";

import { extractText } from "@/lib/ai/text";
import { guardAiRequest } from "@/lib/ai/route-helpers";
import { aiErrorMessage, aiErrorStatus } from "@/lib/ai/provider";
import { askMessages, runTask, streamTask } from "@/lib/ai/tasks";
import { ndjsonStream } from "@/lib/ai/stream-response";
import { askDocumentSchema } from "@/lib/validation/ai";

/**
 * Grounded question answering over the current document.
 *
 * The document text is sent with the question rather than retrieved server-side
 * on purpose: the client's copy is the local-first source of truth and may hold
 * unsynced offline edits, so answering from the server's copy could describe a
 * document the user isn't looking at.
 *
 * `?stream=1` streams the answer as NDJSON; otherwise it returns JSON.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const guard = await guardAiRequest(request, id, "ai-ask", 20);
  if ("error" in guard) return guard.error;

  const parsed = askDocumentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const text = extractText(parsed.data.content);
  if (!text.trim()) {
    return NextResponse.json(
      { error: "This document is empty — there's nothing to ask about yet." },
      { status: 422 },
    );
  }

  const messages = askMessages(text, parsed.data.question);

  if (new URL(request.url).searchParams.get("stream") === "1") {
    return ndjsonStream(request, async (send, signal) => {
      for await (const chunk of streamTask("ask", messages, signal)) {
        send({ type: "text", text: chunk });
      }
    });
  }

  try {
    const answer = await runTask("ask", messages, request.signal);
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json({ error: aiErrorMessage(error) }, { status: aiErrorStatus(error) });
  }
}
