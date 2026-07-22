import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { getDocumentAccess } from "@/lib/authz/documents";
import { signCollabToken } from "@/lib/collab/token";
import { checkBodySize, checkRateLimit } from "@/lib/security/guard";

const bodySchema = z.object({ documentId: z.string().min(1).max(64) });

export async function POST(request: Request) {
  const limited = checkRateLimit(request, "collab-token", 60, 60_000);
  if (limited) return limited;
  const tooLarge = checkBodySize(request, 1_024);
  if (tooLarge) return tooLarge;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const access = await getDocumentAccess(session.user.id, parsed.data.documentId);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = await signCollabToken({
    userId: session.user.id,
    documentId: access.id,
    role: access.role,
  });

  return NextResponse.json({ token });
}
