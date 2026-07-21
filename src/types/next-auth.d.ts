import type { DefaultSession } from "next-auth";

// Add our `id` to the session user and the JWT so `session.user.id` is typed
// everywhere instead of being `any`.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
