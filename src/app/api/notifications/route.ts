import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { listNotifications, markNotificationsRead } from "@/lib/authz/notifications";
import { checkBodySize, checkRateLimit } from "@/lib/security/guard";
import { badRequest, readJson } from "@/lib/security/document-route";
import { markNotificationsReadSchema } from "@/lib/validation/workspace";

export async function GET(request: Request) {
  const limited = await checkRateLimit(request, "notifications", 120, 60_000);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await listNotifications(session.user.id));
}

/** Marks notifications read: `{ all: true }` or `{ ids: [...] }`. */
export async function POST(request: Request) {
  const limited = await checkRateLimit(request, "notifications-read", 60, 60_000);
  if (limited) return limited;
  const tooLarge = checkBodySize(request, 8_192);
  if (tooLarge) return tooLarge;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = markNotificationsReadSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest();

  const updated = await markNotificationsRead(session.user.id, parsed.data);
  return NextResponse.json({ updated });
}
