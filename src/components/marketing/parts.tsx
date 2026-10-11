import { cn } from "@/lib/utils";

/**
 * Small marketing building blocks shared by the public pages.
 */

/** Section label: a soft pill above a headline. */
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
        "inline-flex items-center rounded-full px-3.5 py-1 text-sm font-semibold",
        inverted ? "bg-white/10 text-white" : "bg-primary-subtle text-primary",
        className,
      )}
    >
      {children}
    </p>
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

/**
 * Frame for a feature illustration: an outlined card sitting on a solid navy
 * block offset to one side, so the visual reads as an object on the page.
 * Rises into place as it scrolls into view (where supported).
 */
export function FeatureVisual({
  children,
  className,
  slab = "right",
}: {
  children: React.ReactNode;
  className?: string;
  /** Which side the block peeks out from. */
  slab?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "reveal relative pb-4 sm:pb-5",
        slab === "right" ? "pr-4 sm:pr-5" : "pl-4 sm:pl-5",
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          "bg-slab absolute top-8 bottom-0 rounded-[26px]",
          slab === "right" ? "right-0 left-8" : "right-8 left-0",
        )}
      />
      <div className="border-foreground/15 bg-subtle relative overflow-hidden rounded-[24px] border p-4 sm:p-7 dark:border-white/10">
        {children}
      </div>
    </div>
  );
}

/** A labelled chip that starts or annotates a flow inside a feature visual. */
export function FlowChip({
  icon,
  children,
  className,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "border-primary/35 bg-surface text-primary inline-flex w-fit items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold shadow-xs [&_svg]:size-3.5",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Dotted connector between flow steps; its dots march toward the node it ends in. */
export function FlowLine({
  direction = "down",
  className,
}: {
  direction?: "down" | "right";
  className?: string;
}) {
  if (direction === "right") {
    return (
      <span className={cn("flex min-w-4 flex-1 items-center", className)}>
        <span className="text-foreground/40 flow-dots-x h-0.5 flex-1" />
        <span className="bg-foreground/70 size-1.5 shrink-0 rounded-full" />
      </span>
    );
  }
  return (
    <span className={cn("flex h-7 flex-col items-center", className)}>
      <span className="text-foreground/40 flow-dots-y w-0.5 flex-1" />
      <span className="bg-foreground/70 size-1.5 shrink-0 rounded-full" />
    </span>
  );
}

/** Two-column list of feature points, each led by a filled glyph. */
export function GlyphList({
  items,
  className,
}: {
  items: { icon: React.ReactNode; label: string }[];
  className?: string;
}) {
  return (
    <ul className={cn("grid gap-x-8 gap-y-4 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3 text-[15px] font-semibold">
          <span className="text-primary [&_svg]:size-[22px]">{item.icon}</span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
