import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Manrope } from "next/font/google";
import { ToastContainer } from "react-toastify";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { RouteProgress } from "@/components/layout/route-progress";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

// Self-hosted at build time by next/font: no runtime request to Google, no
// layout shift (fallback metrics are adjusted to match).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Display face for headlines; Inter carries the interface and body text.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "CollabDoc — Write together. Even offline.",
    template: "%s · CollabDoc",
  },
  description:
    "A local-first collaborative document workspace. Real-time CRDT sync, safe version history, role-based sharing and AI that reads your documents — and it keeps working without the internet.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  openGraph: {
    type: "website",
    siteName: "CollabDoc",
    title: "CollabDoc — Write together. Even offline.",
    description:
      "Local-first collaborative documents with real-time CRDT sync, version history, role-based sharing and grounded AI.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c16" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: next-themes sets the theme class on <html>
    // before hydration, so the server and client markup legitimately differ here.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${manrope.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh">
        <ThemeProvider>
          {/* Lets keyboard users jump past the navigation on every page. */}
          <a
            href="#main-content"
            className="bg-ink text-ink-foreground sr-only z-100 rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Skip to content
          </a>

          {/* useSearchParams needs a Suspense boundary to keep pages static. */}
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>

          {children}

          <ServiceWorkerRegister />
          <ToastContainer
            position="bottom-right"
            autoClose={3500}
            newestOnTop
            closeOnClick={false}
            pauseOnFocusLoss={false}
            theme="colored"
            toastClassName="!rounded-xl !text-sm !shadow-lg"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
