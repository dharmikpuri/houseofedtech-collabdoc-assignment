import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { CLOSING, pickLabel } from "@/content/landing";

/** The dark closing band with the final call to action. */
export function ClosingBand({ primaryHref, signedIn }: { primaryHref: string; signedIn: boolean }) {
  return (
    <section className="bg-band relative overflow-hidden text-white">
      <div className="container-page relative flex flex-col items-center justify-between gap-10 py-[clamp(4rem,8vw,6rem)] text-center lg:flex-row lg:text-left">
        <div className="max-w-2xl">
          <h2 className="section-title text-balance">{CLOSING.title}</h2>
          <p className="mt-4 text-lg leading-relaxed text-white/70">{CLOSING.body}</p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg" variant="inverse">
            <Link href={primaryHref}>
              {pickLabel(CLOSING.primaryCta, signedIn)}
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="inverse-outline">
            <Link href={ROUTES.lab}>{CLOSING.labCta}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
