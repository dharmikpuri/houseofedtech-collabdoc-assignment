import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ROUTES } from "@/config/routes";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="bg-wash pointer-events-none absolute inset-x-0 top-0 h-[480px]" aria-hidden />
      <header className="container-page relative flex h-16 items-center">
        <Logo />
      </header>
      <main
        id="main-content"
        className="relative mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 pb-24 text-center"
      >
        <LostPageArt />
        <p className="bg-primary-subtle text-primary mt-8 rounded-full px-3 py-1 text-sm font-semibold">
          Error 404
        </p>
        <h1 className="section-title mt-4">Page not found</h1>
        <p className="text-muted-foreground mt-4 text-sm text-balance">
          It doesn&apos;t exist, or you don&apos;t have access to it. If someone shared a link with
          you, ask them to check your role.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Button asChild size="lg">
            <Link href={ROUTES.dashboard}>
              <ArrowLeft />
              Back to documents
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href={ROUTES.home}>Go to homepage</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

/** A document with a missing block, under a magnifying glass. */
function LostPageArt() {
  return (
    <svg viewBox="0 0 240 160" className="h-40 w-auto" fill="none" aria-hidden>
      <ellipse cx="124" cy="146" rx="84" ry="8" className="fill-muted" />
      {/* Back page */}
      <rect
        x="58"
        y="24"
        width="84"
        height="108"
        rx="10"
        className="fill-surface stroke-border"
        strokeWidth="1.5"
        transform="rotate(-7 100 78)"
      />
      {/* Front page */}
      <rect
        x="78"
        y="14"
        width="90"
        height="116"
        rx="10"
        className="fill-surface stroke-border-strong"
        strokeWidth="1.5"
      />
      <rect x="92" y="32" width="40" height="6" rx="3" className="fill-foreground" />
      <rect x="92" y="48" width="62" height="4" rx="2" className="fill-muted" />
      <rect x="92" y="58" width="54" height="4" rx="2" className="fill-muted" />
      <rect x="92" y="68" width="58" height="4" rx="2" className="fill-muted" />
      {/* The part that isn't there */}
      <rect
        x="92"
        y="84"
        width="62"
        height="30"
        rx="6"
        className="stroke-primary"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      {/* Magnifier */}
      <path d="M194 122l15 15" className="stroke-primary" strokeWidth="6" strokeLinecap="round" />
      <circle
        cx="178"
        cy="106"
        r="22"
        className="fill-primary-subtle stroke-primary"
        strokeWidth="3.5"
      />
      <text
        x="178"
        y="114"
        textAnchor="middle"
        className="fill-primary"
        fontSize="22"
        fontWeight="800"
        fontFamily="var(--font-manrope), sans-serif"
      >
        ?
      </text>
    </svg>
  );
}
