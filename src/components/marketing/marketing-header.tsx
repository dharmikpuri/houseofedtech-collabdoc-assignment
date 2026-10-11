import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileNav } from "@/components/marketing/mobile-nav";
import { ROUTES } from "@/config/routes";
import { MARKETING_NAV } from "@/config/navigation";

/**
 * Public-site header. Sticky, on the same pale tint as the hero so the two read
 * as one surface at the top of the page. Links sit inline on desktop and in a
 * menu below it.
 */
export function MarketingHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="border-border bg-subtle/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4 lg:gap-8">
        <Logo />

        <nav aria-label="Primary" className="hidden flex-1 items-center gap-0.5 lg:flex">
          {MARKETING_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-[15px] font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {signedIn ? (
            <Button asChild size="md">
              <Link href={ROUTES.dashboard}>
                <span className="hidden sm:inline">Open workspace</span>
                <span className="sm:hidden">Workspace</span>
                <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="md" className="hidden sm:inline-flex">
                <Link href={ROUTES.signIn}>Sign in</Link>
              </Button>
              <Button asChild size="md">
                <Link href={ROUTES.signUp}>Get started</Link>
              </Button>
            </>
          )}
          <MobileNav links={MARKETING_NAV} signedIn={signedIn} />
        </div>
      </div>
    </header>
  );
}
