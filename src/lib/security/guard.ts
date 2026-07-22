import { NextResponse } from "next/server";

import { clientIp, rateLimit } from "@/lib/security/rate-limit";

/**
 * Rate-limit a request by client IP scoped to a named bucket. Returns a 429
 * response to return early, or null when the request may proceed.
 */
export function checkRateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const key = `${bucket}:${clientIp(request.headers)}`;
  const result = rateLimit(key, limit, windowMs);
  if (result.ok) return null;
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  );
}

/** Reject an oversized body before it is buffered into memory. */
export function checkBodySize(request: Request, maxBytes: number): NextResponse | null {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) {
    return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
  }
  return null;
}
