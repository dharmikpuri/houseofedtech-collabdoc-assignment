import { log, redact } from "@/lib/observability/logger";

/**
 * Error reporting.
 *
 * Every error is logged. If SENTRY_DSN is set, it is also sent to Sentry using
 * the plain envelope HTTP API — no SDK, so no bundle weight, no build-time
 * wizard, and it runs unchanged in both the Node and Edge runtimes. Reporting
 * is fire-and-forget with a short timeout: a slow or down Sentry must never
 * slow down or break the request that failed.
 */

type Context = {
  /** Where it happened, e.g. "route:/api/search" or "client". */
  source: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

type ParsedDsn = { endpoint: string; publicKey: string };

let parsedDsn: ParsedDsn | null | undefined;

function sentryTarget(): ParsedDsn | null {
  if (parsedDsn !== undefined) return parsedDsn;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return (parsedDsn = null);
  try {
    // https://<publicKey>@<host>/<projectId>
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    if (!url.username || !projectId) return (parsedDsn = null);
    parsedDsn = {
      publicKey: url.username,
      endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
    };
  } catch {
    parsedDsn = null;
  }
  return parsedDsn;
}

function eventId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function frames(stack: string | undefined) {
  if (!stack) return undefined;
  const parsed = stack
    .split("\n")
    .slice(1, 30)
    .map((line) => {
      const match = line.match(/at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/);
      return match
        ? {
            function: match[1] ?? "<anonymous>",
            filename: match[2],
            lineno: Number(match[3]),
            colno: Number(match[4]),
          }
        : null;
    })
    .filter(Boolean)
    // Sentry expects the most recent call last.
    .reverse();
  return parsed.length ? { frames: parsed } : undefined;
}

async function sendToSentry(target: ParsedDsn, error: Error, context: Context) {
  const id = eventId();
  const event = {
    event_id: id,
    timestamp: Date.now() / 1000,
    platform: "javascript",
    level: "error",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RELEASE,
    tags: { source: context.source, ...context.tags },
    extra: redact(context.extra ?? {}),
    exception: {
      values: [{ type: error.name, value: error.message, stacktrace: frames(error.stack) }],
    },
  };
  const envelope = [
    JSON.stringify({ event_id: id, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");

  await fetch(target.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-sentry-envelope",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${target.publicKey}, sentry_client=collabdoc/1.0`,
    },
    body: envelope,
    signal: AbortSignal.timeout(2_000),
  });
}

export function reportError(error: unknown, context: Context): void {
  const err =
    error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error");
  log.error(err.message, {
    source: context.source,
    error: err,
    ...context.tags,
    extra: context.extra,
  });

  const target = sentryTarget();
  if (target) {
    void sendToSentry(target, err, context).catch(() => {
      // Reporting must never throw into the caller.
    });
  }
}

export function isErrorReportingConfigured(): boolean {
  return sentryTarget() !== null;
}
