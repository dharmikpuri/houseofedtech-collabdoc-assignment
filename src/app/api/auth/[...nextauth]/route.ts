import { handlers } from "@/auth";

// Auth.js mounts all of its endpoints (callback, session, csrf, signout, ...)
// under /api/auth/* through this single catch-all route.
export const { GET, POST } = handlers;
