import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while a document's versions, collaborators and tags load. Mirrors
 * the editor's header, toolbar and page so the swap to real content is calm.
 */
export function DocumentSkeleton() {
  return (
    <div className="animate-fade-in flex h-[calc(100dvh-3.5rem)] flex-col" aria-busy>
      <span className="sr-only" role="status">
        Opening document…
      </span>

      <div className="border-border bg-surface/60 shrink-0 border-b px-4 py-3 sm:px-6">
        <Skeleton className="h-3 w-40" />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-72 max-w-[60vw]" />
            <div className="flex gap-1.5">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>

      <div className="border-border flex items-center gap-2 border-b px-3 py-2">
        <Skeleton className="h-7 w-28 rounded-full" />
        <div className="flex-1" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="size-8 rounded-md" />
        ))}
      </div>

      <div className="border-border flex items-center gap-1 border-b px-2 py-1.5">
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton key={index} className="size-8 rounded-md" />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto w-full max-w-3xl space-y-4 px-5 py-10 sm:px-10 sm:py-14">
          <Skeleton className="h-8 w-1/2" />
          {[96, 88, 92, 70].map((width, index) => (
            <Skeleton key={index} className="h-4" style={{ width: `${width}%` }} />
          ))}
          <Skeleton className="mt-8 h-6 w-1/3" />
          {[90, 84, 60].map((width, index) => (
            <Skeleton key={index} className="h-4" style={{ width: `${width}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
