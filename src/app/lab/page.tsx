import type { Metadata } from "next";

import { auth } from "@/auth";
import { SiteFooter } from "@/components/layout/site-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { SectionLabel } from "@/components/marketing/parts";
import { SyncLab } from "@/components/lab/sync-lab";

export const metadata: Metadata = {
  title: "Sync lab",
  description:
    "Watch two offline devices edit the same document and merge deterministically — a live demonstration of CollabDoc's CRDT sync.",
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
        <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-10 max-w-2xl">
            <SectionLabel>Sync lab</SectionLabel>
            <h1 className="font-display mt-5 text-4xl leading-[1.08] sm:text-5xl">
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
