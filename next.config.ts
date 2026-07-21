import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prisma ships a native query engine that must not be bundled by Turbopack;
  // keep it external so it's required at runtime instead.
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Security headers applied to every response. Tightened further (CSP) in the
  // security phase once we know every origin the app talks to.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
