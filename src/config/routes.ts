/**
 * Every in-app path, defined once.
 *
 * Pure data with no imports, so it is safe to use from edge code (the proxy),
 * server actions and client components alike. Rename a route here and every
 * link, redirect and guard follows.
 */

export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  forgotPassword: "/forgot-password",
  dashboard: "/dashboard",
  search: "/search",
  settings: "/settings",
  lab: "/lab",
} as const;

/** Prefix shared by every document page. */
export const DOCUMENTS_PREFIX = "/documents";

/** Paths that require a signed-in user (enforced by the proxy). */
export const PROTECTED_PREFIXES = [
  ROUTES.dashboard,
  DOCUMENTS_PREFIX,
  ROUTES.search,
  ROUTES.settings,
] as const;

/** Pages a signed-in user is sent away from. */
export const AUTH_PAGES = [ROUTES.signIn, ROUTES.signUp] as const;

/** Element ids of the landing page's sections. */
export const LANDING_IDS = {
  features: "features",
  howItWorks: "how-it-works",
  history: "history",
  ai: "ai",
  security: "security",
  faq: "faq",
  demo: "demo",
} as const;

export type LandingSection = keyof typeof LANDING_IDS;

/** Sections of the landing page, linkable from any page. */
export const LANDING_SECTIONS = Object.fromEntries(
  Object.entries(LANDING_IDS).map(([key, id]) => [key, `/#${id}`]),
) as { [K in LandingSection]: `/#${(typeof LANDING_IDS)[K]}` };

/** A document, optionally opened at a comment thread. */
export function documentPath(id: string, options: { thread?: string } = {}): string {
  const path = `${DOCUMENTS_PREFIX}/${id}`;
  return options.thread ? `${path}?thread=${encodeURIComponent(options.thread)}` : path;
}

export function invitePath(token: string): string {
  return `/invite/${token}`;
}

/** Search, optionally pre-filled with a query. */
export function searchPath(query?: string): string {
  return query ? `${ROUTES.search}?q=${encodeURIComponent(query)}` : ROUTES.search;
}

/** Sign-in, returning to `callbackUrl` afterwards. */
export function signInPath(callbackUrl?: string): string {
  return callbackUrl
    ? `${ROUTES.signIn}?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : ROUTES.signIn;
}

/** A filtered view of the dashboard. */
export function dashboardViewPath(view: "favorites" | "recent" | "shared"): string {
  return `${ROUTES.dashboard}?view=${view}`;
}
