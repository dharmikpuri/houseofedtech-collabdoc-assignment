import { cn } from "@/lib/utils";

/**
 * Small marketing building blocks shared by the public pages.
 */

/** Section label: a short brand rule and an uppercase word, above a headline. */
export function SectionLabel({
  children,
  className,
  inverted = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** For use on a filled brand or ink panel. */
  inverted?: boolean;
}) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.08em] uppercase",
        inverted ? "text-white/80" : "text-primary",
        className,
      )}
    >
      <span className={cn("h-px w-6", inverted ? "bg-white/50" : "bg-primary")} aria-hidden />
      {children}
    </p>
  );
}

/**
 * A collaborator's caret with a name flag, for use inside headlines and mock
 * documents. Decorative.
 */
export function Caret({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative mx-[0.04em] inline-block h-[0.95em] w-[0.06em] min-w-0.5 translate-y-[0.12em]",
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      <span
        className="absolute bottom-full left-0 rounded-sm rounded-bl-none px-1.5 py-0.5 font-sans text-[11px] leading-none font-semibold tracking-normal whitespace-nowrap text-white"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </span>
  );
}

/** A plain browser window around a product visual. */
export function BrowserFrame({
  url,
  children,
  className,
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-surface overflow-hidden rounded-2xl border shadow-lg",
        className,
      )}
      aria-hidden
    >
      <div className="border-border bg-subtle flex h-10 items-center gap-3 border-b px-4">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#f26b5e]" />
          <span className="size-2.5 rounded-full bg-[#f5bd4f]" />
          <span className="size-2.5 rounded-full bg-[#5fc454]" />
        </div>
        <div className="border-border bg-surface text-muted-foreground mx-auto flex h-6 w-72 max-w-[60%] items-center justify-center rounded-md border text-[11px]">
          {url}
        </div>
        <span className="w-12" />
      </div>
      {children}
    </div>
  );
}
