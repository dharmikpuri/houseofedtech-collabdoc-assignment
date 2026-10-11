import { NextResponse } from "next/server";

import { revokeShareLink } from "@/lib/authz/share-links";
import { authorizeDocumentRoute } from "@/lib/security/document-route";
import { idSchema } from "@/lib/validation/workspace";

/** Revokes an invite link immediately. Owner only. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> },
) {
  const { id, linkId } = await params;
  const guard = await authorizeDocumentRoute(request, id, {
    bucket: "share-links-revoke",
    limit: 60,
    capability: "manageSharing",
  });
  if ("error" in guard) return guard.error;
  if (!idSchema.safeParse(linkId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ok = await revokeShareLink({ actorId: guard.context.userId, documentId: id, linkId });
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}
