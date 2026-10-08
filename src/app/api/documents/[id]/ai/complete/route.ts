import { NextResponse } from "next/server";

import { can } from "@/lib/authz/roles";
import { guardAiRequest } from "@/lib/ai/route-helpers";
import { aiErrorMessage, aiErrorStatus } from "@/lib/ai/provider";
import { completeText } from "@/lib/ai/tasks";
import { completeSchema } from "@/lib/validation/ai";

/**
 * Inline autocomplete: suggests a continuation for the text before the caret.
 *
 * Requires `edit` — accepting a suggestion writes to the document. The client
 * sends at most a few thousand characters of context and debounces requests,
 * and the per-IP rate limit bounds the rest.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const guard = await guardAiRequest(request, id, "ai-complete", 60);
  if ("error" in guard) return guard.error;
  if (!can(guard.context.role, "edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = completeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const completion = await completeText(parsed.data.before, request.signal);
    return NextResponse.json({ completion });
  } catch (error) {
    return NextResponse.json({ error: aiErrorMessage(error) }, { status: aiErrorStatus(error) });
  }
}
