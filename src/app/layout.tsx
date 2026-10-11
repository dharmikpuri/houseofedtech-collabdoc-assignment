import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Manrope } from "next/font/google";
import { ToastContainer } from "react-toastify";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { RouteProgress } from "@/components/layout/route-progress";
import { BRAND_COLORS, SITE } from "@/config/site";
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
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND_COLORS.backgroundLight },
    { media: "(prefers-color-scheme: dark)", color: BRAND_COLORS.backgroundDark },
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
      {/* Browser extensions (colour pickers, password managers) add attributes
          to <body> before React hydrates; this silences that attribute-only
          mismatch on this one element. Children are still checked. */}
      <body className="min-h-dvh" suppressHydrationWarning>
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
