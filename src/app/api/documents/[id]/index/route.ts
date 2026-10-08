import { NextResponse } from "next/server";

import { extractText } from "@/lib/ai/text";
import { indexDocumentText } from "@/lib/search/indexer";
import { authorizeDocumentRoute, badRequest, readJson } from "@/lib/security/document-route";
import { documentContentSchema, MAX_AI_CONTENT_BYTES } from "@/lib/validation/ai";

/**
 * Updates a document's semantic-search index from the editor's current
 * content. Called (debounced) by the editor after edits, so search reflects
 * work that may not have reached the collaboration server's store yet.
 *
 * Requires `edit`: whoever can change the document can refresh its index;
 * viewers can't write index data for it.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await authorizeDocumentRoute(request, id, {
    bucket: "document-index",
    limit: 12,
    maxBodyBytes: MAX_AI_CONTENT_BYTES + 4_096,
    capability: "edit",
  });
  if ("error" in guard) return guard.error;

  const parsed = documentContentSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

  try {
    const status = await indexDocumentText(
      guard.context.userId,
      id,
      guard.context.title,
      extractText(parsed.data.content),
    );
    return NextResponse.json({ status });
  } catch {
    // Indexing is best-effort background work; the editor ignores failures.
    return NextResponse.json({ error: "Indexing failed" }, { status: 502 });
  }
}
