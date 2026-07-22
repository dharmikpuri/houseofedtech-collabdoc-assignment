import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDocumentAccess } from "@/lib/authz/documents";
import { can } from "@/lib/authz/roles";
import { createVersion, listVersions } from "@/lib/authz/versions";
import { createVersionSchema } from "@/lib/validation/version";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getDocumentAccess(session.user.id, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ versions: await listVersions(id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getDocumentAccess(session.user.id, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!can(access.role, "createVersion")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createVersionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const version = await createVersion({
    documentId: id,
    authorId: session.user.id,
    label: parsed.data.label,
    content: parsed.data.content as object,
  });

  return NextResponse.json({ version }, { status: 201 });
}
