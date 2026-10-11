import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDocumentAccess } from "@/lib/authz/documents";
import { can } from "@/lib/authz/roles";
import { createVersion, listVersions, MAX_VERSIONS_PER_DOCUMENT } from "@/lib/authz/versions";
import { createVersionSchema, MAX_VERSION_CONTENT_BYTES } from "@/lib/validation/version";
import { checkBodySize, checkRateLimit } from "@/lib/security/guard";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getDocumentAccess(session.user.id, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ versions: await listVersions(session.user.id, id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limited = await checkRateLimit(request, "version-create", 30, 60_000);
  if (limited) return limited;
  const tooLarge = checkBodySize(request, MAX_VERSION_CONTENT_BYTES + 2_048);
  if (tooLarge) return tooLarge;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getDocumentAccess(session.user.id, id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!can(access.role, "createVersion")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createVersionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const result = await createVersion({
    documentId: id,
    authorId: session.user.id,
    label: parsed.data.label,
    content: parsed.data.content as object,
    clientMutationId: parsed.data.clientMutationId,
    capturedAt: parsed.data.capturedAt,
    restoreOf: parsed.data.restoreOf,
  });

  if (!result.ok) {
    return result.reason === "limit"
      ? NextResponse.json(
          {
            error: `This document has reached the limit of ${MAX_VERSIONS_PER_DOCUMENT} saved versions.`,
          },
          { status: 422 },
        )
      : NextResponse.json({ error: "Mutation id already used" }, { status: 409 });
  }

  // 201 for a new snapshot; 200 when an idempotent replay resolved to the
  // snapshot a previous delivery already created.
  return NextResponse.json(
    { version: { id: result.id }, replayed: result.replayed },
    { status: result.replayed ? 200 : 201 },
  );
}
