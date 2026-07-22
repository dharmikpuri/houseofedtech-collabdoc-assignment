import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prisma ships a native query engine that must not be bundled by Turbopack;
  // keep it external so it's required at runtime instead.
  serverExternalPackages: ["@prisma/client", "prisma"],
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];

    // A strict CSP is only applied in production: the dev server needs inline
    // eval and a websocket to itself for hot-module reloading, which the policy
    // below deliberately forbids.
    if (process.env.NODE_ENV === "production") {
      headers.push({ key: "Content-Security-Policy", value: contentSecurityPolicy() });
    }

    return [{ source: "/:path*", headers }];
  },
};

function contentSecurityPolicy(): string {
  const ws = process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? "";
  const connect = ["'self'", ws].filter(Boolean).join(" ");
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export default nextConfig;
