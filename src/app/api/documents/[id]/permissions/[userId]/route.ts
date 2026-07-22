import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDocumentAccess } from "@/lib/authz/documents";
import { can } from "@/lib/authz/roles";
import { removeCollaborator } from "@/lib/authz/sharing";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id, userId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getDocumentAccess(session.user.id, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!can(access.role, "manageSharing")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await removeCollaborator({ actorId: session.user.id, documentId: id, userId });
  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 400;
    const message = result.reason === "not_found" ? "Not found" : "The owner can't be removed";
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true });
}
