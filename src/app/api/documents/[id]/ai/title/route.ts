import { NextResponse } from "next/server";

import { can } from "@/lib/authz/roles";
import { extractText } from "@/lib/ai/text";
import { guardAiRequest } from "@/lib/ai/route-helpers";
import { aiErrorMessage, aiErrorStatus } from "@/lib/ai/provider";
import { suggestTitle } from "@/lib/ai/tasks";
import { documentContentSchema } from "@/lib/validation/ai";

/**
 * Suggests a title from the document's content. It only *suggests*: the user
 * accepts it explicitly, and the rename then goes through the normal
 * (offline-capable) rename path. Requires `edit`, like renaming itself.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const guard = await guardAiRequest(request, id, "ai-title", 15);
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
      { error: "Write a little more first — there isn't enough to name yet." },
      { status: 422 },
    );
  }

  try {
    const title = await suggestTitle(text.slice(0, 20_000));
    if (!title)
      return NextResponse.json({ error: "No title suggestion this time." }, { status: 502 });
    return NextResponse.json({ title });
  } catch (error) {
    return NextResponse.json({ error: aiErrorMessage(error) }, { status: aiErrorStatus(error) });
  }
}
