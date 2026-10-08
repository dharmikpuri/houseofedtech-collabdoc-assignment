import { NextResponse } from "next/server";

import { addReply, deleteThread, setThreadResolved } from "@/lib/authz/comments";
import { authorizeDocumentRoute, badRequest, readJson } from "@/lib/security/document-route";
import { idSchema, replySchema, resolveThreadSchema } from "@/lib/validation/workspace";

type Params = { params: Promise<{ id: string; threadId: string }> };

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

/** Reply to a thread. */
export async function POST(request: Request, { params }: Params) {
  const { id, threadId } = await params;
  const guard = await authorizeDocumentRoute(request, id, {
    bucket: "comments-reply",
    limit: 60,
    maxBodyBytes: 8_192,
    capability: "edit",
  });
  if ("error" in guard) return guard.error;
  if (!idSchema.safeParse(threadId).success) return notFound();

  const parsed = replySchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

  const result = await addReply({
    actorId: guard.context.userId,
    documentId: id,
    threadId,
    ...parsed.data,
  });
  if (!result.ok) return notFound();
  return NextResponse.json({ comment: result.comment }, { status: 201 });
}

/** Resolve or reopen a thread. */
export async function PATCH(request: Request, { params }: Params) {
  const { id, threadId } = await params;
  const guard = await authorizeDocumentRoute(request, id, {
    bucket: "comments-resolve",
    limit: 60,
    maxBodyBytes: 256,
    capability: "edit",
  });
  if ("error" in guard) return guard.error;
  if (!idSchema.safeParse(threadId).success) return notFound();

  const parsed = resolveThreadSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest();

  const result = await setThreadResolved({
    actorId: guard.context.userId,
    documentId: id,
    threadId,
    resolved: parsed.data.resolved,
  });
  return result.ok ? NextResponse.json({ ok: true }) : notFound();
}

/** Delete a thread — its author, or the document owner as moderator. */
export async function DELETE(request: Request, { params }: Params) {
  const { id, threadId } = await params;
  const guard = await authorizeDocumentRoute(request, id, {
    bucket: "comments-delete",
    limit: 60,
    capability: "edit",
  });
  if ("error" in guard) return guard.error;
  if (!idSchema.safeParse(threadId).success) return notFound();

  const result = await deleteThread({
    actorId: guard.context.userId,
    documentId: id,
    threadId,
    isOwner: guard.context.role === "OWNER",
  });
  if (result.ok) return NextResponse.json({ ok: true });
  return result.reason === "forbidden"
    ? NextResponse.json(
        { error: "Only the author or the owner can delete this thread." },
        { status: 403 },
      )
    : notFound();
}
