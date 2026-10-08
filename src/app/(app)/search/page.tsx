import { Suspense } from "react";
import type { Metadata } from "next";
import { Lock } from "lucide-react";

import { isAiEnabled } from "@/lib/ai/gemini";
import { SearchWorkspace } from "@/components/search/search-workspace";

export const metadata: Metadata = { title: "Search & Ask" };

export default function SearchPage() {
  return (
    <div className="animate-page-in">
      <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-8 sm:py-9">
        <div>
          <h1 className="font-display text-[1.75rem] leading-tight">Search &amp; Ask</h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            Find documents by meaning, or ask a question and get an answer drawn from everything you
            can access — with links to the sources.
          </p>
          <p className="text-muted-foreground mt-2 inline-flex items-center gap-1.5 text-xs">
            <Lock className="size-3" aria-hidden />
            Results only ever include documents you&apos;re allowed to open.
          </p>
        </div>
        <div className="mt-6">
          {/* Reads the query from the URL (useSearchParams). */}
          <Suspense fallback={null}>
            <SearchWorkspace aiEnabled={isAiEnabled()} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
