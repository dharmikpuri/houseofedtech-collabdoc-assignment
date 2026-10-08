import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { createDocument, listDocuments } from "@/lib/authz/documents";
import { checkBodySize, checkRateLimit } from "@/lib/security/guard";
import { badRequest, readJson } from "@/lib/security/document-route";
import { createDocumentBodySchema } from "@/lib/validation/workspace";

/** The caller's documents with their personal metadata (palette, sidebar). */
export async function GET(request: Request) {
  const limited = await checkRateLimit(request, "documents-list", 120, 60_000);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await listDocuments(session.user.id);
  return NextResponse.json({
    documents: documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      role: doc.role,
      favorite: doc.favorite,
      folderId: doc.folderId,
      updatedAt: doc.updatedAt.toISOString(),
      lastOpenedAt: doc.lastOpenedAt?.toISOString() ?? null,
    })),
  });
}

/** Creates a document (used by the command palette and Markdown import). */
export async function POST(request: Request) {
  const limited = await checkRateLimit(request, "documents-create", 30, 60_000);
  if (limited) return limited;
  const tooLarge = checkBodySize(request, 2_048);
  if (tooLarge) return tooLarge;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createDocumentBodySchema.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

  const document = await createDocument(session.user.id, parsed.data.title, parsed.data.source);
  revalidatePath("/dashboard");
  return NextResponse.json({ id: document.id }, { status: 201 });
}
