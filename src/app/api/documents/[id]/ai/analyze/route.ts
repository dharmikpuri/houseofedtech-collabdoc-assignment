import { NextResponse } from "next/server";

import { extractText } from "@/lib/ai/text";
import { guardAiRequest } from "@/lib/ai/route-helpers";
import { aiErrorMessage, aiErrorStatus } from "@/lib/ai/provider";
import { analysisMessages, runTask, streamTask } from "@/lib/ai/tasks";
import { ndjsonStream } from "@/lib/ai/stream-response";
import { documentTaskSchema } from "@/lib/validation/ai";

/**
 * Whole-document analysis: executive summary, action items, key insights.
 *
 * Reading is enough to run these — a Viewer can summarise a document they are
 * allowed to read, because the result never mutates shared state.
 *
 * `?stream=1` streams the answer as NDJSON; otherwise it returns JSON.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const guard = await guardAiRequest(request, id, "ai-analyze", 15);
  if ("error" in guard) return guard.error;

  const parsed = documentTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const text = extractText(parsed.data.content);
  if (!text.trim()) {
    return NextResponse.json(
      { error: "This document is empty — add some content first." },
      { status: 422 },
    );
  }

  const messages = analysisMessages(parsed.data.task, text);

  if (new URL(request.url).searchParams.get("stream") === "1") {
    return ndjsonStream(request, async (send, signal) => {
      for await (const chunk of streamTask(parsed.data.task, messages, signal)) {
        send({ type: "text", text: chunk });
      }
    });
  }

  try {
    const result = await runTask(parsed.data.task, messages, request.signal);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: aiErrorMessage(error) }, { status: aiErrorStatus(error) });
  }
}
