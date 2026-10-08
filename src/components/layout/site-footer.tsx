import Link from "next/link";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

/**
 * Global footer with the author's name, GitHub, and LinkedIn.
 *
 * The brand marks are inline SVG rather than icon-library components: lucide
 * dropped brand icons in v1, and substituting a generic glyph for a recognised
 * logo reads as a mistake.
 */
export const AUTHOR = {
  name: "Dharmik Puri Goswami",
  github: "https://github.com/dharmikpuri",
  linkedin: "https://www.linkedin.com/in/dharmikpurigoswami/",
};

function GithubMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}

function LinkedinMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

const AUTHOR_LINKS = [
  { href: AUTHOR.github, label: "GitHub", Mark: GithubMark },
  { href: AUTHOR.linkedin, label: "LinkedIn", Mark: LinkedinMark },
];

/** Small icon-only author links, for tight spaces like the auth screens. */
export function AuthorLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Author links" className={cn("flex items-center gap-1", className)}>
      {AUTHOR_LINKS.map(({ href, label, Mark }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${AUTHOR.name} on ${label}`}
          className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 items-center justify-center rounded-md transition-colors"
        >
          <Mark className="size-4" />
        </a>
      ))}
    </nav>
  );
}

const PRODUCT_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How sync works" },
  { href: "/#security", label: "Security" },
  { href: "/lab", label: "Sync lab" },
];

const ACCOUNT_LINKS = [
  { href: "/sign-up", label: "Create account" },
  { href: "/sign-in", label: "Sign in" },
  { href: "/dashboard", label: "Open the app" },
];

export function SiteFooter({ variant = "full" }: { variant?: "full" | "compact" }) {
  if (variant === "compact") {
    return (
      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-sm sm:flex-row sm:px-6">
          <p>
            Designed &amp; built by{" "}
            <span className="text-foreground font-medium">{AUTHOR.name}</span>
          </p>
          <AuthorLinks />
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-border bg-surface/40 border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-xs">
          <Logo />
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            A local-first collaborative workspace. Your documents live on your device first and
            merge with everyone else&apos;s the moment you&apos;re back online.
          </p>
          <div className="mt-5 flex items-center gap-2">
            {AUTHOR_LINKS.map(({ href, label, Mark }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border bg-surface text-muted-foreground hover:text-foreground hover:border-border-strong inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium shadow-xs transition-colors"
              >
                <Mark className="size-3.5" />
                {label}
              </a>
            ))}
          </div>
        </div>

        <FooterColumn title="Product" links={PRODUCT_LINKS} />
        <FooterColumn title="Account" links={ACCOUNT_LINKS} />
      </div>

      <div className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs sm:flex-row sm:px-6">
          <p>
            Designed &amp; built by{" "}
            <a
              href={AUTHOR.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground font-medium hover:underline"
            >
              {AUTHOR.name}
            </a>
          </p>
          <p className="font-mono tracking-tight">Next.js · Yjs · Hocuspocus · Postgres · Gemini</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h2 className="text-foreground text-xs font-semibold tracking-wide uppercase">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
