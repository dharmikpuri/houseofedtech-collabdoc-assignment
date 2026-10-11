import { cn } from "@/lib/utils";
import {
  AskFlow,
  HistoryFlow,
  MergeFlow,
  OfflineFlow,
  SecurityFlow,
} from "@/components/marketing/art/feature-flows";
import { FeatureVisual, GlyphList } from "@/components/marketing/parts";
import { SectionHeader } from "@/components/marketing/section";
import type { Feature, FeatureVisualKey } from "@/content/landing";

const VISUALS: Record<FeatureVisualKey, () => React.ReactNode> = {
  offline: OfflineFlow,
  merge: MergeFlow,
  history: HistoryFlow,
  ask: AskFlow,
  security: SecurityFlow,
};

/**
 * One feature: label, two-line headline, intro and glyph list beside its flow
 * illustration. Alternate rows set `reverse` in the content to swap sides.
 */
export function FeatureRow({ feature }: { feature: Feature }) {
  const Visual = VISUALS[feature.visual];
  return (
    <section id={feature.id} className="section-y scroll-mt-20">
      <div className="container-page grid items-center gap-[clamp(2.5rem,5vw,5rem)] lg:grid-cols-2">
        <div
          className={cn(
            "mx-auto w-full max-w-[40rem] lg:max-w-none",
            feature.reverse && "lg:order-2",
          )}
        >
          <SectionHeader
            align="start"
            accentOnNewLine
            label={feature.label}
            title={feature.title}
            accent={feature.accent}
            description={feature.body}
          />
          <GlyphList
            className="mt-8"
            items={feature.points.map(({ icon: Icon, label }) => ({ icon: <Icon />, label }))}
          />
        </div>
        <FeatureVisual
          slab={feature.reverse ? "left" : "right"}
          className="mx-auto w-full max-w-[40rem] lg:max-w-none"
        >
          <Visual />
        </FeatureVisual>
      </div>
    </section>
  );
}
