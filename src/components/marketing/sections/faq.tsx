import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { Section } from "@/components/marketing/section";
import { LANDING_IDS, ROUTES } from "@/config/routes";
import { FAQ, pickLabel } from "@/content/landing";

/** Questions as native disclosures, beside a panel pointing to the sync lab. */
export function Faq({ primaryHref, signedIn }: { primaryHref: string; signedIn: boolean }) {
  const panel = FAQ.panel;
  return (
    <Section id={LANDING_IDS.faq} tone="subtle">
      <h2 className="section-title text-center">{FAQ.title}</h2>

      <div className="mt-[clamp(2.5rem,5vw,3.5rem)] grid items-start gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-3">
          {FAQ.items.map((item) => (
            <details
              key={item.q}
              className="group border-border bg-surface rounded-xl border shadow-xs"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown
                  className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="text-muted-foreground -mt-1 px-5 pb-5 text-[15px] leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <div className="border-primary/15 bg-primary-subtle rounded-3xl border p-7 sm:p-9 lg:sticky lg:top-24">
          <h3 className="font-display text-2xl">{panel.title}</h3>
          <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">{panel.body}</p>
          <ol className="mt-7 space-y-4">
            {panel.steps.map(({ icon: Icon, text }, index) => (
              <li key={text} className="flex items-center gap-3.5">
                <IconTile size="lg" tone="surface">
                  <Icon />
                </IconTile>
                <span className="text-[15px] font-semibold">
                  <span className="text-muted-foreground mr-1.5 font-mono text-xs">
                    0{index + 1}
                  </span>
                  {text}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Button asChild size="lg" className="flex-1">
              <Link href={ROUTES.lab}>{panel.labCta}</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="flex-1">
              <Link href={primaryHref}>{pickLabel(panel.accountCta, signedIn)}</Link>
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
