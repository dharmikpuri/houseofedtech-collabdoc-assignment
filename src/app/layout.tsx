import type { Metadata, Viewport } from "next";
import { ToastContainer } from "react-toastify";
import { SiteFooter } from "@/components/layout/site-footer";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CollabDoc — Local-First Collaborative Editor",
    template: "%s · CollabDoc",
  },
  description:
    "A local-first collaborative document editor with offline sync, deterministic conflict resolution, and version history.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <ServiceWorkerRegister />
        <ToastContainer position="bottom-right" autoClose={3000} theme="colored" newestOnTop />
      </body>
    </html>
  );
}
