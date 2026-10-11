import { NextResponse } from "next/server";

import { can } from "@/lib/authz/roles";
import { extractText } from "@/lib/ai/text";
import { guardAiRequest } from "@/lib/ai/route-helpers";
import { aiErrorMessage, aiErrorStatus } from "@/lib/ai/provider";
import { suggestTags } from "@/lib/ai/tasks";
import { listTags } from "@/lib/authz/tags";
import { documentContentSchema } from "@/lib/validation/ai";

/** Suggests tags for the document (excluding ones it already has). Requires `edit`. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const guard = await guardAiRequest(request, id, "ai-tags", 15);
  if ("error" in guard) return guard.error;
  if (!can(guard.context.role, "edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = documentContentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const text = extractText(parsed.data.content);
  if (text.split(/\s+/).filter(Boolean).length < 8) {
    return NextResponse.json(
      { error: "Write a little more first — there isn't enough to tag yet." },
      { status: 422 },
    );
  }

  try {
    const existing = await listTags(guard.context.userId, id);
    const tags = await suggestTags(text.slice(0, 20_000), existing);
    return NextResponse.json({ tags });
  } catch (error) {
    return NextResponse.json({ error: aiErrorMessage(error) }, { status: aiErrorStatus(error) });
  }
}
