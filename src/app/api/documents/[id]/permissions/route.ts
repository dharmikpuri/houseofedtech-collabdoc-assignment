import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDocumentAccess } from "@/lib/authz/documents";
import { can } from "@/lib/authz/roles";
import { listCollaborators, shareDocument } from "@/lib/authz/sharing";
import { shareDocumentSchema } from "@/lib/validation/sharing";
import { checkBodySize, checkRateLimit } from "@/lib/security/guard";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getDocumentAccess(session.user.id, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!can(access.role, "manageSharing")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ collaborators: await listCollaborators(session.user.id, id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limited = await checkRateLimit(request, "share", 20, 60_000);
  if (limited) return limited;
  const tooLarge = checkBodySize(request, 4_096);
  if (tooLarge) return tooLarge;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getDocumentAccess(session.user.id, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!can(access.role, "manageSharing")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = shareDocumentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const result = await shareDocument({
    actorId: session.user.id,
    documentId: id,
    email: parsed.data.email,
    role: parsed.data.role,
  });

  if (!result.ok) {
    const message =
      result.reason === "user_not_found"
        ? "No account found with that email"
        : "That user already owns this document";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ collaborator: result.collaborator }, { status: 201 });
}
