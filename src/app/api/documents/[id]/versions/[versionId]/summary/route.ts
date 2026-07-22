import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDocumentAccess } from "@/lib/authz/documents";
import { getVersionContent } from "@/lib/authz/versions";
import { extractText } from "@/lib/ai/text";
import { isAiEnabled, summarizeChanges } from "@/lib/ai/gemini";
import { checkBodySize, checkRateLimit } from "@/lib/security/guard";
import { MAX_SUMMARY_CONTENT_BYTES, summaryRequestSchema } from "@/lib/validation/summary";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  const { id, versionId } = await params;
  const limited = checkRateLimit(request, "summary", 15, 60_000);
  if (limited) return limited;
  const tooLarge = checkBodySize(request, MAX_SUMMARY_CONTENT_BYTES + 2_048);
  if (tooLarge) return tooLarge;

  if (!isAiEnabled()) {
    return NextResponse.json({ error: "AI summaries are not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getDocumentAccess(session.user.id, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = summaryRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const version = await getVersionContent(session.user.id, id, versionId);
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldText = extractText(version.content);
  const newText = extractText(parsed.data.currentContent);
  if (!oldText && !newText) {
    return NextResponse.json({ summary: "Both versions are empty." });
  }

  try {
    const summary = await summarizeChanges(oldText, newText);
    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ error: "Could not generate a summary right now" }, { status: 502 });
  }
}
