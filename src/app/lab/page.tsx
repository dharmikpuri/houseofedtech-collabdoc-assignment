import type { Metadata } from "next";

import { auth } from "@/auth";
import { SiteFooter } from "@/components/layout/site-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { SectionLabel } from "@/components/marketing/parts";
import { SyncLab } from "@/components/lab/sync-lab";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "Sync lab",
  description: `Watch two offline devices edit the same document and merge with nothing lost — a live demonstration of ${SITE.name}'s offline sync.`,
};

/**
 * Public demonstration of the sync engine. Deliberately outside the
 * authenticated route group: it runs entirely in the browser and touches no
 * server data, so anyone evaluating the project can try it without an account.
 */
export default async function LabPage() {
  const session = await auth();

  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader signedIn={Boolean(session?.user)} />

      <main id="main-content" className="relative flex-1">
        <div
          className="bg-wash pointer-events-none absolute inset-x-0 top-0 h-[420px]"
          aria-hidden
        />
        <div className="container-page relative py-[clamp(2.5rem,5vw,3.5rem)]">
          <div className="mb-10 max-w-2xl">
            <SectionLabel>Sync lab</SectionLabel>
            <h1 className="section-title mt-5">
              Break the network. <span className="text-primary">Keep writing.</span>
            </h1>
            <p className="text-muted-foreground mt-4 text-base leading-relaxed text-balance">
              Two devices, one document. Take either one offline, edit on both — even the same
              sentence — then reconnect. They merge to the identical result every time, with no
              conflict dialog and nothing lost. Everything here runs in your browser.
            </p>
          </div>

          <SyncLab />
        </div>
      </main>

      <SiteFooter variant="compact" />
    </div>
  );
}
