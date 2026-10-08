import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDocumentAccess } from "@/lib/authz/documents";
import { isAiEnabled } from "@/lib/ai/gemini";
import { checkBodySize, checkRateLimit } from "@/lib/security/guard";
import { MAX_AI_CONTENT_BYTES } from "@/lib/validation/ai";
import type { Role } from "@/lib/authz/roles";

/**
 * Shared front door for the AI routes.
 *
 * Every AI endpoint has to do the same five things in the same order, and the
 * order matters for safety: throttle and size-check before any parsing so a
 * flood of huge bodies is rejected cheaply, then authenticate, then authorise
 * against the document. Centralising it means a new AI route cannot
 * accidentally omit one.
 *
 * Returns either a `Response` to return immediately, or the resolved context.
 */
export type AiRouteContext = {
  userId: string;
  documentId: string;
  role: Role;
};

export async function guardAiRequest(
  request: Request,
  documentId: string,
  bucket: string,
  limit = 20,
): Promise<{ error: NextResponse } | { context: AiRouteContext }> {
  const limited = await checkRateLimit(request, bucket, limit, 60_000);
  if (limited) return { error: limited };

  const tooLarge = checkBodySize(request, MAX_AI_CONTENT_BYTES + 4_096);
  if (tooLarge) return { error: tooLarge };

  if (!isAiEnabled()) {
    return {
      error: NextResponse.json(
        { error: "AI features aren't configured on this deployment." },
        { status: 503 },
      ),
    };
  }

  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // 404 rather than 403: never confirm a document exists to someone without
  // access to it.
  const access = await getDocumentAccess(session.user.id, documentId);
  if (!access) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return {
    context: { userId: session.user.id, documentId: access.id, role: access.role },
  };
}
