import { NextResponse } from "next/server";

import { can } from "@/lib/authz/roles";
import { guardAiRequest } from "@/lib/ai/route-helpers";
import { aiErrorMessage, aiErrorStatus } from "@/lib/ai/provider";
import { rewriteSelection } from "@/lib/ai/tasks";
import { rewriteSchema } from "@/lib/validation/ai";

/**
 * Rewrites a selected passage (improve / shorten / bulletize).
 *
 * Unlike the read-only AI endpoints this one requires the `edit` capability:
 * its output is written straight back into the shared document, so a Viewer
 * must not be able to call it. The capability matrix is the same one the collab
 * server and the RLS policies defer to.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const guard = await guardAiRequest(request, id, "ai-rewrite", 20);
  if ("error" in guard) return guard.error;

  if (!can(guard.context.role, "edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = rewriteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const result = await rewriteSelection(parsed.data.text, parsed.data.mode);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: aiErrorMessage(error) }, { status: aiErrorStatus(error) });
  }
}
