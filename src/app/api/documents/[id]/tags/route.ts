import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { listTags, setTags } from "@/lib/authz/tags";
import { authorizeDocumentRoute, badRequest, readJson } from "@/lib/security/document-route";
import { setTagsSchema } from "@/lib/validation/ai";
import { ROUTES } from "@/config/routes";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await authorizeDocumentRoute(request, id, { bucket: "tags-read", limit: 120 });
  if ("error" in guard) return guard.error;
  return NextResponse.json({ tags: await listTags(guard.context.userId, id) });
}

/** Replaces the tag set. Requires `edit` — tags are shared with collaborators. */
export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await authorizeDocumentRoute(request, id, {
    bucket: "tags-write",
    limit: 60,
    maxBodyBytes: 2_048,
    capability: "edit",
  });
  if ("error" in guard) return guard.error;

  const parsed = setTagsSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

  const result = await setTags(guard.context.userId, id, parsed.data.tags);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason === "forbidden" ? "Forbidden" : "Not found" },
      { status: result.reason === "forbidden" ? 403 : 404 },
    );
  }
  revalidatePath(ROUTES.dashboard);
  return NextResponse.json({ tags: result.tags });
}
