import { after, NextResponse } from "next/server";

import { auth } from "@/auth";
import { isAiEnabled } from "@/lib/ai/gemini";
import { indexCoverage, refreshStaleIndexes } from "@/lib/search/indexer";
import { searchDocuments } from "@/lib/search/search";
import { checkBodySize, checkRateLimit } from "@/lib/security/guard";
import { badRequest, readJson } from "@/lib/security/document-route";
import { searchSchema } from "@/lib/validation/ai";

/**
 * Semantic search across the caller's documents (with a title-match
 * fallback). After responding, stale indexes are refreshed in the background,
 * so the next search is fresher without making this one slower.
 */
export async function POST(request: Request) {
  const limited = await checkRateLimit(request, "search", 30, 60_000);
  if (limited) return limited;
  const tooLarge = checkBodySize(request, 2_048);
  if (tooLarge) return tooLarge;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = searchSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

  const [results, coverage] = await Promise.all([
    searchDocuments(userId, parsed.data.query),
    indexCoverage(userId),
  ]);

  if (isAiEnabled()) {
    after(async () => {
      await refreshStaleIndexes(userId, 3).catch(() => undefined);
    });
  }

  return NextResponse.json({ results, coverage, semantic: isAiEnabled() });
}
