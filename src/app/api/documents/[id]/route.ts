import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { renameDocument } from "@/lib/authz/documents";
import { checkBodySize, checkRateLimit } from "@/lib/security/guard";
import { renameDocumentSchema } from "@/lib/validation/document";

/**
 * Rename a document.
 *
 * A REST endpoint (rather than only a server action) so the client's offline
 * mutation queue can replay it later: queued work must be a plain, retryable
 * HTTP request. Renaming is naturally idempotent — replaying the same title
 * twice leaves the same result — so it needs no idempotency key.
 *
 * Authorization lives in `renameDocument`, which requires the `edit` capability
 * and runs under the caller's RLS scope.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const limited = await checkRateLimit(request, "document-rename", 60, 60_000);
  if (limited) return limited;
  const tooLarge = checkBodySize(request, 2_048);
  if (tooLarge) return tooLarge;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = renameDocumentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid title" },
      { status: 400 },
    );
  }

  const result = await renameDocument(session.user.id, id, parsed.data.title);
  if (!result.ok) {
    return result.reason === "forbidden"
      ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
      : NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Keep the dashboard's server-rendered list in step with the new title.
  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true, title: parsed.data.title });
}
