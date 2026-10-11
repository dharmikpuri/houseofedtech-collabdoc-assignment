import { MergeLoader } from "@/components/brand/merge-loader";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while a document's versions, collaborators and tags load. The header
 * and toolbars are mirrored as skeletons so the swap to real content is calm;
 * the page itself shows the merge loader.
 */
export function DocumentSkeleton() {
  return (
    <div className="animate-fade-in flex h-[calc(100dvh-3.5rem)] flex-col" aria-busy>
      <div className="border-border bg-surface/60 shrink-0 border-b px-[clamp(1rem,3vw,2.5rem)] py-3">
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

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-[8vh]">
        <MergeLoader
          label="Opening document…"
          detail="Syncing your local copy with collaborators"
        />
      </div>
    </div>
  );
}
