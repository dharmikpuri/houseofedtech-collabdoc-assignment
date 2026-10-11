"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import type { NavLink } from "@/config/navigation";
import { ROUTES } from "@/config/routes";

/**
 * Below the desktop breakpoint the header's links don't fit inline, so they
 * move into a disclosure panel under the header. Closes on navigation, on
 * Escape, and when the viewport grows past the breakpoint.
 */
export function MobileNav({ links, signedIn }: { links: NavLink[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 64rem)");
    const onResize = () => {
      if (desktop.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((current) => !current)}
        className="text-foreground hover:bg-muted flex size-9 items-center justify-center rounded-lg transition-colors"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-border bg-background absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] animate-[fade-in_0.15s_ease-out] overflow-y-auto border-b shadow-md"
        >
          <ul className="container-page grid gap-1 py-3 sm:grid-cols-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="hover:bg-muted block rounded-lg px-3 py-3 text-[15px] font-medium transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {!signedIn && (
              <li className="sm:hidden">
                <Link
                  href={ROUTES.signIn}
                  onClick={() => setOpen(false)}
                  className="text-primary hover:bg-muted block rounded-lg px-3 py-3 text-[15px] font-semibold transition-colors"
                >
                  Sign in
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </div>
  );
}
