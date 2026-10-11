import type { NextAuthConfig } from "next-auth";
import { AUTH_PAGES, PROTECTED_PREFIXES, ROUTES } from "@/config/routes";

/**
 * Edge-safe Auth.js config. This half contains NO database or Node-only code,
 * so it can run inside Next.js middleware (edge runtime). The Credentials
 * provider — which needs Prisma + bcrypt — is added in `auth.ts`, which only
 * runs in the Node runtime (route handlers, server actions, server components).
 */

// Routes that require a signed-in user (PROTECTED_PREFIXES) are gated by the
// `authorized` callback below, which middleware runs on every matched request.

export const authConfig = {
  // Honour the deployment host when validating callback/redirect URLs.
  trustHost: true,
  pages: {
    signIn: ROUTES.signIn,
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isProtected = PROTECTED_PREFIXES.some((prefix) => nextUrl.pathname.startsWith(prefix));

      // Block unauthenticated access to protected routes (redirects to signIn).
      if (isProtected) return isLoggedIn;

      // Signed-in users landing on an auth page get bounced to the dashboard.
      const isAuthPage = AUTH_PAGES.some((page) => nextUrl.pathname === page);
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL(ROUTES.dashboard, nextUrl));
      }

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user?.id) token.id = user.id;
      // A profile edit refreshes the display name in the session without a new
      // sign-in. Only the name is accepted from the update payload.
      const name = (session as { user?: { name?: unknown } } | undefined)?.user?.name;
      if (trigger === "update" && typeof name === "string" && name.trim()) {
        token.name = name.trim().slice(0, 80);
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
  providers: [], // real providers are attached in auth.ts (Node runtime)
} satisfies NextAuthConfig;
