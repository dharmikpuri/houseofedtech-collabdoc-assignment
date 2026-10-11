import { NextResponse } from "next/server";

import { listActivity } from "@/lib/authz/activity";
import { authorizeDocumentRoute, badRequest } from "@/lib/security/document-route";
import { activityCursorSchema } from "@/lib/validation/workspace";

/** A page of the document's activity feed. `?before=<iso>` pages backwards. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await authorizeDocumentRoute(request, id, { bucket: "activity", limit: 120 });
  if ("error" in guard) return guard.error;

  const before = new URL(request.url).searchParams.get("before") ?? undefined;
  const cursor = activityCursorSchema.safeParse(before);
  if (!cursor.success) return badRequest("Invalid cursor");

  return NextResponse.json(await listActivity(guard.context.userId, id, cursor.data));
}
