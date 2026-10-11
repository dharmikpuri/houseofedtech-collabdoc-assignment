import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { deleteFolder, renameFolder } from "@/lib/authz/folders";
import { checkBodySize, checkRateLimit } from "@/lib/security/guard";
import { badRequest, readJson } from "@/lib/security/document-route";
import { idSchema, renameFolderSchema } from "@/lib/validation/workspace";

type Params = { params: Promise<{ folderId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { folderId } = await params;
  const limited = await checkRateLimit(request, "folders-update", 60, 60_000);
  if (limited) return limited;
  const tooLarge = checkBodySize(request, 1_024);
  if (tooLarge) return tooLarge;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!idSchema.safeParse(folderId).success) return badRequest("Invalid folder");

  const parsed = renameFolderSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

  const ok = await renameFolder(session.user.id, folderId, parsed.data.name);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(request: Request, { params }: Params) {
  const { folderId } = await params;
  const limited = await checkRateLimit(request, "folders-delete", 60, 60_000);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!idSchema.safeParse(folderId).success) return badRequest("Invalid folder");

  const ok = await deleteFolder(session.user.id, folderId);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}
