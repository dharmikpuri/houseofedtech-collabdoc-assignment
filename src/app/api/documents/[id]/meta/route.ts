import { NextResponse } from "next/server";

import { setDocumentMeta } from "@/lib/authz/documents";
import { authorizeDocumentRoute, badRequest, readJson } from "@/lib/security/document-route";
import { documentMetaSchema } from "@/lib/validation/workspace";

/**
 * Updates the caller's personal organisation of a document (favourite,
 * folder). Any role may do this — it changes only how *they* see it.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await authorizeDocumentRoute(request, id, {
    bucket: "document-meta",
    limit: 120,
    maxBodyBytes: 1_024,
  });
  if ("error" in guard) return guard.error;

  const parsed = documentMetaSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

  const result = await setDocumentMeta(guard.context.userId, id, parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason === "folder_not_found" ? "Folder not found" : "Not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
