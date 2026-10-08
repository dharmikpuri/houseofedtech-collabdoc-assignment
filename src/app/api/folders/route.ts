import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createFolder, listFolders } from "@/lib/authz/folders";
import { checkBodySize, checkRateLimit } from "@/lib/security/guard";
import { badRequest, readJson } from "@/lib/security/document-route";
import { createFolderSchema } from "@/lib/validation/workspace";

export async function GET(request: Request) {
  const limited = await checkRateLimit(request, "folders-list", 120, 60_000);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ folders: await listFolders(session.user.id) });
}

export async function POST(request: Request) {
  const limited = await checkRateLimit(request, "folders-create", 30, 60_000);
  if (limited) return limited;
  const tooLarge = checkBodySize(request, 1_024);
  if (tooLarge) return tooLarge;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createFolderSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

  const result = await createFolder(session.user.id, parsed.data.name);
  if (!result.ok) {
    return NextResponse.json({ error: "You've reached the folder limit (100)." }, { status: 409 });
  }
  return NextResponse.json({ folder: result.folder }, { status: 201 });
}
