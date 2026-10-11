/**
 * Fixed-window rate limiting with a pluggable store.
 *
 *  - Upstash Redis (REST) when UPSTASH_REDIS_REST_URL / _TOKEN are set: limits
 *    are shared across every server instance, which is what a multi-instance
 *    or serverless deployment needs.
 *  - In-process memory otherwise: correct for a single node and for local dev.
 *
 * If Redis is unreachable, that request falls back to the in-memory window.
 * Limits degrade to per-instance for the outage — they never switch off, and a
 * Redis incident never takes the app down with it.
 */

export type RateLimitResult = { ok: boolean; retryAfter: number };

// ── In-memory store ──────────────────────────────────────────────────────────

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    // Buckets self-expire; the sweep bounds memory under abuse.
    if (buckets.size > 10_000) sweep(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

// ── Redis store (Upstash REST) ───────────────────────────────────────────────

const REDIS_TIMEOUT_MS = 800;

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redisLimit(
  config: { url: string; token: string },
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  // One round trip: count this hit, start the window on the first hit only
  // (NX), and read how long the window has left.
  const res = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", `rl:${key}`],
      ["PEXPIRE", `rl:${key}`, String(windowMs), "NX"],
      ["PTTL", `rl:${key}`],
    ]),
    signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis responded ${res.status}`);

  const [incr, , pttl] = (await res.json()) as { result?: number; error?: string }[];
  const count = Number(incr?.result);
  const ttl = Number(pttl?.result);
  if (!Number.isFinite(count)) throw new Error("Unexpected Redis response");

  if (count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((ttl > 0 ? ttl : windowMs) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const config = redisConfig();
  if (config) {
    try {
      return await redisLimit(config, key, limit, windowMs);
    } catch {
      // Fall through to the local window rather than failing open.
    }
  }
  return memoryLimit(key, limit, windowMs);
}

/** Which store is active — surfaced by the health endpoint. */
export function rateLimitStore(): "redis" | "memory" {
  return redisConfig() ? "redis" : "memory";
}

/** Best-effort client identifier from proxy headers, falling back to a constant. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
