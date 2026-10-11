import { DocumentCardSkeleton, Skeleton } from "@/components/ui/skeleton";

/**
 * Streamed while the dashboard's data loads. The shapes mirror the real layout
 * so the page doesn't jump when content arrives.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-fade-in container-app py-[clamp(1.75rem,3vw,2.5rem)]" aria-busy>
      <span className="sr-only" role="status">
        Loading your documents…
      </span>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>

      <Skeleton className="mt-8 h-18.5 w-full rounded-xl" />

      <div className="mt-8 flex flex-col gap-6 lg:flex-row">
        <div className="hidden w-56 shrink-0 space-y-1.5 lg:block">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex gap-2.5">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <DocumentCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
