import { NextResponse } from "next/server";

import { createThread, listThreads } from "@/lib/authz/comments";
import { authorizeDocumentRoute, badRequest, readJson } from "@/lib/security/document-route";
import { createThreadSchema } from "@/lib/validation/workspace";

type Params = { params: Promise<{ id: string }> };

/** Any member can read the conversation. */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await authorizeDocumentRoute(request, id, { bucket: "comments-list", limit: 120 });
  if ("error" in guard) return guard.error;

  return NextResponse.json({ threads: await listThreads(guard.context.userId, id) });
}

/**
 * Opening a thread anchors a mark in the document itself, so it needs the
 * same `edit` capability as typing. Viewers read comments but don't add them —
 * consistent with viewers never pushing changes to a document.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await authorizeDocumentRoute(request, id, {
    bucket: "comments-create",
    limit: 30,
    maxBodyBytes: 8_192,
    capability: "edit",
  });
  if ("error" in guard) return guard.error;

  const parsed = createThreadSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

  const result = await createThread({
    actorId: guard.context.userId,
    documentId: id,
    ...parsed.data,
  });
  // A duplicate id is the same request arriving twice; the thread exists.
  return NextResponse.json(
    { threadId: parsed.data.threadId, duplicate: !result.ok },
    { status: result.ok ? 201 : 200 },
  );
}
