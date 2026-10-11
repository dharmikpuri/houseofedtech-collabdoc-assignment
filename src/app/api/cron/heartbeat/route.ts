import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { log } from "@/lib/observability/logger";
import { checkRateLimit } from "@/lib/security/guard";

export const dynamic = "force-dynamic";

const SOURCE = "vercel-cron";

/** Constant-time comparison; hashing first makes the lengths equal. */
function matches(provided: string, expected: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

/**
 * Daily keep-alive, called by Vercel Cron (see vercel.json).
 *
 * A free Supabase project pauses after a week without database activity, so
 * this writes a row rather than just pinging. Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; without the secret configured the
 * route stays closed instead of becoming public.
 */
export async function GET(request: Request) {
  const limited = await checkRateLimit(request, "cron-heartbeat", 10, 60_000);
  if (limited) return limited;

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Heartbeat is not configured." }, { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  if (!matches(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const beat = await prisma.heartbeat.upsert({
      where: { source: SOURCE },
      create: { source: SOURCE },
      update: { beatAt: new Date(), beats: { increment: 1 } },
    });
    return NextResponse.json(
      { ok: true, beatAt: beat.beatAt.toISOString(), beats: beat.beats },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    log.error("heartbeat write failed", { source: SOURCE, error });
    return NextResponse.json({ error: "Heartbeat failed." }, { status: 500 });
  }
}
