import { NextResponse } from "next/server";

import { listMembers } from "@/lib/authz/sharing";
import { authorizeDocumentRoute } from "@/lib/security/document-route";

/** People with access, for @mention autocomplete. Names only, no emails. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await authorizeDocumentRoute(request, id, { bucket: "members", limit: 60 });
  if ("error" in guard) return guard.error;

  return NextResponse.json({ members: await listMembers(guard.context.userId, id) });
}
