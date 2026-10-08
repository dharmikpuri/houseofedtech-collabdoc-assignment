import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDocumentAccess } from "@/lib/authz/documents";
import { can, type Capability, type Role } from "@/lib/authz/roles";
import { checkBodySize, checkRateLimit } from "@/lib/security/guard";

/**
 * Shared front door for document-scoped API routes.
 *
 * Every such route must do the same things in the same order — throttle and
 * size-check before any parsing (so floods of large bodies are rejected
 * cheaply), then authenticate, then authorise against the document using the
 * one capability matrix. Centralising it means a new route can't forget a
 * step. Mirrors `guardAiRequest` for the AI routes.
 */
export type DocumentRouteContext = {
  userId: string;
  documentId: string;
  role: Role;
  title: string;
};

export async function authorizeDocumentRoute(
  request: Request,
  documentId: string,
  options: {
    bucket: string;
    limit?: number;
    maxBodyBytes?: number;
    capability?: Capability;
  },
): Promise<{ error: NextResponse } | { context: DocumentRouteContext }> {
  const limited = await checkRateLimit(request, options.bucket, options.limit ?? 60, 60_000);
  if (limited) return { error: limited };

  if (options.maxBodyBytes !== undefined) {
    const tooLarge = checkBodySize(request, options.maxBodyBytes);
    if (tooLarge) return { error: tooLarge };
  }

  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // 404, not 403, when there's no access: never confirm a document exists.
  const access = await getDocumentAccess(session.user.id, documentId);
  if (!access) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  if (options.capability && !can(access.role, options.capability)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    context: {
      userId: session.user.id,
      documentId: access.id,
      role: access.role,
      title: access.title,
    },
  };
}

/** Parses a JSON body, returning null instead of throwing on bad input. */
export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

export function badRequest(message = "Invalid request") {
  return NextResponse.json({ error: message }, { status: 400 });
}
