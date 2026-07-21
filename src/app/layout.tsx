import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CollabDoc — Local-First Collaborative Editor",
    template: "%s · CollabDoc",
  },
  description:
    "A local-first collaborative document editor with offline sync, deterministic conflict resolution, and version history.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
