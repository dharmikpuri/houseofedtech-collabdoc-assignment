import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Middleware runs on the edge, so it uses only the edge-safe config (no Prisma).
// The `authorized` callback in authConfig decides who may access what.
// Exported as a default function so Next.js can detect it statically.
export default NextAuth(authConfig).auth;

export const config = {
  // Run on everything except Next internals, the auth API, and static assets.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
