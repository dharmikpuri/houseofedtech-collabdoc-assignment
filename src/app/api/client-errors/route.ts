import { NextResponse } from "next/server";
import { z } from "zod";

import { reportError } from "@/lib/observability/report";
import { checkBodySize, checkRateLimit } from "@/lib/security/guard";

const schema = z.object({
  message: z.string().max(1_000),
  stack: z.string().max(8_000).optional(),
  digest: z.string().max(100).optional(),
  path: z.string().max(500).optional(),
});

/**
 * Receives errors caught by the browser's error boundary, so client-side
 * crashes are visible alongside server ones. Unauthenticated on purpose (the
 * crash may be the auth flow), so it is tightly rate-limited and size-capped,
 * and only accepts a small, validated shape.
 */
export async function POST(request: Request) {
  const limited = await checkRateLimit(request, "client-errors", 10, 60_000);
  if (limited) return limited;
  const tooLarge = checkBodySize(request, 12_000);
  if (tooLarge) return tooLarge;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid report" }, { status: 400 });

  const error = new Error(parsed.data.message);
  error.name = "ClientError";
  if (parsed.data.stack) error.stack = parsed.data.stack;
  reportError(error, {
    source: "client",
    extra: { digest: parsed.data.digest, path: parsed.data.path },
  });

  return new NextResponse(null, { status: 204 });
}
