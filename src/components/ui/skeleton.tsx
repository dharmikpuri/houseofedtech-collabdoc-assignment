import { cn } from "@/lib/utils";

/**
 * Loading placeholder with a sweeping highlight (`.skeleton` in globals.css).
 * The sweep is visible from the first frame, so even a short load reads as
 * "working" rather than a flash. Marked `motion-essential` so it keeps moving
 * under reduced-motion settings — it's a status indicator, not decoration.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton motion-essential rounded-md", className)}
      // Decorative: the live region announcing "loading" belongs on the
      // container, not on each bar.
      aria-hidden
      {...props}
    />
  );
}

/** Skeleton shaped like a document card in the grid view. */
export function DocumentCardSkeleton() {
  return (
    <div className="border-border bg-surface overflow-hidden rounded-xl border">
      <Skeleton className="h-32 rounded-none" />
      <div className="space-y-2.5 p-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
