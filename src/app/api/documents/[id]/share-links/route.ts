import { NextResponse } from "next/server";

import { createShareLink, listShareLinks } from "@/lib/authz/share-links";
import { authorizeDocumentRoute, badRequest, readJson } from "@/lib/security/document-route";
import { createShareLinkSchema } from "@/lib/validation/workspace";

type Params = { params: Promise<{ id: string }> };

/** Active invite links. Owner only (`manageSharing`). */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await authorizeDocumentRoute(request, id, {
    bucket: "share-links-list",
    limit: 60,
    capability: "manageSharing",
  });
  if ("error" in guard) return guard.error;

  return NextResponse.json({ links: await listShareLinks(guard.context.userId, id) });
}

/**
 * Creates an invite link. The raw token is returned exactly once, here; only
 * its hash is stored, so it can't be shown again later.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await authorizeDocumentRoute(request, id, {
    bucket: "share-links-create",
    limit: 20,
    maxBodyBytes: 512,
    capability: "manageSharing",
  });
  if ("error" in guard) return guard.error;

  const parsed = createShareLinkSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

  const result = await createShareLink({
    actorId: guard.context.userId,
    documentId: id,
    ...parsed.data,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: "Too many active links. Revoke one before creating another." },
      { status: 409 },
    );
  }

  const origin = new URL(request.url).origin;
  return NextResponse.json(
    { link: result.link, url: `${origin}/invite/${result.token}` },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
