import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isAiEnabled } from "@/lib/ai/gemini";
import { indexCoverage, refreshStaleIndexes } from "@/lib/search/indexer";
import { checkRateLimit } from "@/lib/security/guard";

/**
 * Brings the caller's search index up to date, a few documents per call (the
 * search page calls it until nothing remains). Reads each document's stored
 * CRDT state, so it indexes documents nobody has opened recently too.
 */
export async function POST(request: Request) {
  const limited = await checkRateLimit(request, "search-index", 12, 60_000);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAiEnabled()) {
    return NextResponse.json(
      { error: "AI features aren't configured on this deployment." },
      { status: 503 },
    );
  }

  const { indexed, remaining } = await refreshStaleIndexes(session.user.id, 5);
  const coverage = await indexCoverage(session.user.id);
  return NextResponse.json({ indexed, remaining, coverage });
}
