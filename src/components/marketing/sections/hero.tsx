import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { GlyphHistory, GlyphPlay, GlyphQueue } from "@/components/brand/glyphs";
import { HeroSyncDemo } from "@/components/marketing/hero-sync-demo";
import { LANDING_IDS } from "@/config/routes";
import { PERSONAS } from "@/config/site";
import { HERO, pickLabel } from "@/content/landing";

/**
 * Landing hero: headline, live-editing pill, calls to action, section
 * shortcuts, and the playable sync demo with cards floating beside it.
 */
export function Hero({ primaryHref, signedIn }: { primaryHref: string; signedIn: boolean }) {
  return (
    <section className="bg-subtle relative">
      <HeroLines />

      <div className="container-page relative pt-[clamp(3rem,7vw,5rem)]">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="hero-title text-balance">
            {HERO.headline.map((line, index) => (
              <span key={index}>
                {index > 0 && <br className="hidden lg:block" />}
                {line.map((part) => (
                  <span
                    key={part.text}
                    className={part.accent ? "text-primary font-extrabold" : "font-medium"}
                  >
                    {part.text}
                  </span>
                ))}
              </span>
            ))}
          </h1>

          <PresencePill />

          <p className="text-muted-foreground mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-balance">
            {HERO.description}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="text-primary hover:border-primary/40 w-full gap-3 rounded-full pr-6 pl-1.5 sm:w-auto"
            >
              <a href={`#${LANDING_IDS.demo}`}>
                <GlyphPlay className="size-9" />
                {HERO.demoCta}
              </a>
            </Button>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={primaryHref}>
                {pickLabel(HERO.primaryCta, signedIn)}
                <ArrowRight />
              </Link>
            </Button>
          </div>

          <nav
            aria-label="Highlights"
            className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3"
          >
            {HERO.highlights.map(({ section, label, icon: Icon }) => (
              <a
                key={section}
                href={`#${LANDING_IDS[section]}`}
                className="hover:text-primary inline-flex items-center gap-2 text-[15px] font-medium transition-colors"
              >
                <Icon className="text-primary" />
                {label}
              </a>
            ))}
          </nav>
        </div>

        {/* The product's core behaviour, playable. */}
        <div
          id={LANDING_IDS.demo}
          className="relative mx-auto mt-[clamp(2.5rem,5vw,3.5rem)] w-full max-w-[64rem] scroll-mt-24"
        >
          <QueueCard />
          <VersionCard />
          <div className="border-primary/15 bg-primary-subtle rounded-t-[28px] border border-b-0 px-3 pt-4 pb-8 sm:px-8 sm:pt-6 sm:pb-12">
            <p className="text-muted-foreground mb-4 text-center text-sm">
              {HERO.demoHint.before}{" "}
              <span className="text-foreground font-semibold">{HERO.demoHint.emphasis}</span>{" "}
              {HERO.demoHint.after}
            </p>
            <HeroSyncDemo />
          </div>
        </div>
      </div>
    </section>
  );
}

/** "3 people editing" — the demo's collaborators, with a live dot. */
function PresencePill() {
  const people = [PERSONAS.aisha, PERSONAS.marco, PERSONAS.priya];
  return (
    <div
      className="border-border bg-surface mt-8 inline-flex items-center gap-3 rounded-full border py-1.5 pr-5 pl-1.5 text-left shadow-sm"
      aria-hidden
    >
      <span className="flex -space-x-2">
        {people.map((person) => (
          <span
            key={person.name}
            className="ring-surface flex size-8 items-center justify-center rounded-full text-xs font-bold text-white ring-2"
            style={{ backgroundColor: person.color }}
          >
            {person.initial}
          </span>
        ))}
      </span>
      <span className="leading-tight">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold">
          <span className="relative flex size-2">
            <span className="bg-success absolute inline-flex size-full animate-[pulse-ring_2.4s_ease-out_infinite] rounded-full" />
            <span className="bg-success relative inline-flex size-2 rounded-full" />
          </span>
          {HERO.presence.title}
        </span>
        <span className="text-muted-foreground block text-xs">{HERO.presence.detail}</span>
      </span>
    </div>
  );
}

/** Marco's queued edits, floating beside the demo. */
function QueueCard() {
  const card = HERO.queueCard;
  return (
    <div
      className="border-border bg-surface absolute top-40 -left-[12.5rem] z-10 hidden w-56 rounded-2xl border p-4 shadow-lg min-[1440px]:block"
      aria-hidden
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <IconTile size="sm" shape="rounded" tone="warning">
          <GlyphQueue />
        </IconTile>
        <span>
          {card.title}
          <span className="text-muted-foreground block text-xs font-normal">{card.detail}</span>
        </span>
      </p>
      <ul className="mt-3 space-y-1.5 text-xs">
        {card.items.map((item) => (
          <li
            key={item}
            className="border-border bg-subtle text-muted-foreground rounded-lg border px-2.5 py-1.5"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A just-saved version, floating beside the demo. */
function VersionCard() {
  const card = HERO.versionCard;
  return (
    <div
      className="border-border bg-surface absolute -right-[12.5rem] bottom-28 z-10 hidden w-56 rounded-2xl border p-4 shadow-lg min-[1440px]:block"
      aria-hidden
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: PERSONAS.aisha.color }}
        >
          {PERSONAS.aisha.initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{card.title}</p>
          <p className="text-muted-foreground text-xs">{card.detail}</p>
        </div>
        <GlyphHistory className="text-primary size-5" />
      </div>
      <div className="mt-3 flex gap-2">
        <span className="border-border flex-1 rounded-lg border py-1.5 text-center text-xs font-semibold">
          {card.compare}
        </span>
        <span className="bg-primary-solid flex-1 rounded-lg py-1.5 text-center text-xs font-semibold text-white">
          {card.restore}
        </span>
      </div>
    </div>
  );
}

/**
 * Faint background linework: strokes from both edges converging behind the
 * demo — the merge from the logo at the scale of the page — with a pulse
 * travelling along each. Kept to the margins so it never runs through text.
 */
const HERO_STROKES = [
  "M-40 170 H 50 C 190 170 180 790 330 790",
  "M-40 560 H 30 C 150 560 190 790 330 790",
  "M1480 170 H 1390 C 1250 170 1260 790 1110 790",
  "M1480 560 H 1410 C 1290 560 1250 790 1110 790",
];

function HeroLines() {
  return (
    <svg
      className="text-primary/[0.12] pointer-events-none absolute inset-0 hidden h-full w-full md:block"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMin slice"
      fill="none"
      aria-hidden
    >
      <g stroke="currentColor" strokeWidth="2">
        {HERO_STROKES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g strokeWidth="2.5" strokeLinecap="round" className="text-primary/45">
        {HERO_STROKES.map((d, index) => (
          <path
            key={d}
            d={d}
            stroke="currentColor"
            pathLength={100}
            strokeDasharray="8 92"
            className="animate-[dash-travel_4.5s_linear_infinite]"
            style={{ animationDelay: `${index * -1.1}s` }}
          />
        ))}
      </g>
    </svg>
  );
}
