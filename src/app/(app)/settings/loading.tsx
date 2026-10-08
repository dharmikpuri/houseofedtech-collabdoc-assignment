import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="animate-fade-in mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10" aria-busy>
      <span className="sr-only" role="status">
        Loading settings…
      </span>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-2 h-8 w-40" />
      <Skeleton className="mt-8 h-40 w-full rounded-2xl" />
      <Skeleton className="mt-6 h-44 w-full rounded-2xl" />
      <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
    </div>
  );
}
