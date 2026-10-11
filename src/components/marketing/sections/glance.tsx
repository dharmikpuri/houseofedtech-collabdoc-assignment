import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/section";
import { GLANCE, pickLabel } from "@/content/landing";

/** Headline numbers, then an inline call to action. */
export function Glance({ primaryHref, signedIn }: { primaryHref: string; signedIn: boolean }) {
  return (
    <Section tone="subtle" labelledBy="glance-heading">
      <h2 id="glance-heading" className="text-center text-xl font-semibold">
        {GLANCE.heading}
      </h2>
      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 text-center lg:grid-cols-4">
        {GLANCE.stats.map((item) => (
          <div key={item.label} className="flex flex-col">
            <dt className="text-muted-foreground order-2 mx-auto mt-2 max-w-48 text-[15px] leading-snug">
              {item.label}
            </dt>
            <dd className="font-display text-[clamp(2.75rem,2rem+2.5vw,3.75rem)] tabular-nums">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-border mt-[clamp(2.5rem,5vw,4rem)] flex flex-col items-center justify-between gap-8 border-t pt-[clamp(2.5rem,5vw,3.5rem)] text-center lg:flex-row lg:text-left">
        <p className="section-title text-balance">
          <span className="font-medium">{GLANCE.cta.title}</span>{" "}
          <span className="text-primary block font-extrabold">{GLANCE.cta.accent}</span>
        </p>
        <Button asChild size="xl" className="shrink-0">
          <Link href={primaryHref}>
            {pickLabel(GLANCE.cta.button, signedIn)}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </Section>
  );
}
