import { Suspense } from "react";
import type { Metadata } from "next";
import { Lock } from "lucide-react";

import { isAiEnabled } from "@/lib/ai/gemini";
import { SearchWorkspace } from "@/components/search/search-workspace";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Search & Ask" };

export default function SearchPage() {
  return (
    <div className="animate-page-in">
      <div className="container-narrow py-[clamp(1.75rem,3vw,2.5rem)]">
        <PageHeader
          title="Search & Ask"
          description="Find documents by meaning, or ask a question and get an answer drawn from everything you can access — with links to the sources."
        >
          <p className="text-muted-foreground mt-2 inline-flex items-center gap-1.5 text-xs">
            <Lock className="size-3" aria-hidden />
            Results only ever include documents you&apos;re allowed to open.
          </p>
        </PageHeader>
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
