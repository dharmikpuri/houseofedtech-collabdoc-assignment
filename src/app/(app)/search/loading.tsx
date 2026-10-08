import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="animate-fade-in mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12" aria-busy>
      <span className="sr-only" role="status">
        Loading search…
      </span>
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="mt-10 space-y-4">
        <Skeleton className="h-9 w-56 rounded-lg" />
        <Skeleton className="h-11 w-full rounded-md" />
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
