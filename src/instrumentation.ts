import type { Instrumentation } from "next";

import { reportError } from "@/lib/observability/report";

/**
 * Next.js calls this for every uncaught error in a route handler, server
 * component, server action or proxy — one place to capture server failures
 * instead of wrapping every handler. Request headers are deliberately not
 * forwarded: they carry session cookies.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  // Digest-bearing errors that Next throws on purpose (redirect, notFound)
  // are control flow, not failures.
  const digest = (error as { digest?: string } | null)?.digest ?? "";
  if (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")) return;

  reportError(error, {
    source: `${context.routeType}:${context.routePath}`,
    tags: { method: request.method, routerKind: context.routerKind },
    extra: { path: request.path, digest },
  });
};
