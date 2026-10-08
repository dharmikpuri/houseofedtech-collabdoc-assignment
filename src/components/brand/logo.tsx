import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The CollabDoc mark: two edit streams curving into one line — the merge the
 * product is built on. Drawn on a 32-unit grid with round joins so it holds up
 * from a 16px favicon to a splash screen. The tile is the same in both themes:
 * it's the brand, not a surface.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="32" height="32" rx="9" fill="#4f5ff5" />
      <g fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Lower stream, set back */}
        <path d="M8 22h3.2c4.4 0 4.6-6 9-6" opacity="0.55" />
        {/* Upper stream, continuing into the merged line */}
        <path d="M8 10h3.2c4.4 0 4.6 6 9 6H24" />
      </g>
      <circle cx="24" cy="16" r="2.6" fill="#fff" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  href = "/",
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  href?: string | null;
  showWordmark?: boolean;
}) {
  const content = (
    <>
      <LogoMark className={markClassName} />
      {showWordmark && <span className="font-display text-[18px]">CollabDoc</span>}
    </>
  );

  const classes = cn("inline-flex items-center gap-2.5 text-foreground", className);

  if (href === null) return <span className={classes}>{content}</span>;

  return (
    <Link href={href} className={classes} aria-label="CollabDoc home">
      {content}
    </Link>
  );
}
