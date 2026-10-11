import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { isAiEnabled } from "@/lib/ai/gemini";
import { rateLimitStore } from "@/lib/security/rate-limit";
import { isErrorReportingConfigured } from "@/lib/observability/report";
import { isEmailConfigured } from "@/lib/email/send";
import { checkRateLimit } from "@/lib/security/guard";

export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 3_000;

/**
 * Liveness/readiness probe for uptime monitors and deploy health checks.
 *
 * Returns 200 when the app can reach its database, 503 otherwise. Reports
 * which optional integrations are configured — never their values.
 */
export async function GET(request: Request) {
  const limited = await checkRateLimit(request, "health", 60, 60_000);
  if (limited) return limited;

  const started = Date.now();
  let database: { ok: boolean; latencyMs?: number } = { ok: false };
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), DB_TIMEOUT_MS)),
    ]);
    database = { ok: true, latencyMs: Date.now() - started };
  } catch {
    database = { ok: false };
  }

  const body = {
    status: database.ok ? "ok" : "degraded",
    time: new Date().toISOString(),
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    checks: {
      database,
      realtime: { configured: Boolean(process.env.NEXT_PUBLIC_COLLAB_WS_URL) },
      ai: { configured: isAiEnabled() },
      rateLimit: { store: rateLimitStore() },
      errorReporting: { configured: isErrorReportingConfigured() },
      email: { configured: isEmailConfigured() },
    },
  };

  return NextResponse.json(body, {
    status: database.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
