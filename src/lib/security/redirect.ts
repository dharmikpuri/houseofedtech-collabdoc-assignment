import { AUTH_PAGES, ROUTES } from "@/config/routes";

/**
 * Turns an untrusted `callbackUrl` into a same-site path.
 *
 * Only the path and query survive — the scheme and host are always dropped —
 * so `https://evil.example`, `//evil.example` and `/\evil.example` can't be
 * used for an open redirect after sign-in. Anything unusable falls back to
 * the dashboard.
 */
export function safeRedirectPath(value: unknown, fallback: string = ROUTES.dashboard): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) return fallback;

  let url: URL;
  try {
    // A fixed base resolves relative paths; for absolute URLs we discard the
    // origin below anyway.
    url = new URL(value, "http://localhost");
  } catch {
    return fallback;
  }

  const path = `${url.pathname}${url.search}`;
  // Reject protocol-relative or backslash tricks that browsers would treat as
  // a different host.
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  // Never bounce back into the auth pages themselves.
  if (AUTH_PAGES.some((page) => path.startsWith(page))) return fallback;
  return path;
}
