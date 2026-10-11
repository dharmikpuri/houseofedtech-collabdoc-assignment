import { cn } from "@/lib/utils";
import { IconTile } from "@/components/ui/icon-tile";
import {
  CommentsMini,
  CursorsMini,
  ExportMini,
  SharingMini,
} from "@/components/marketing/art/bento-art";
import { Section, SectionHeader } from "@/components/marketing/section";
import { BENTO, type BentoArtKey, type Glyph } from "@/content/landing";

const ART: Record<BentoArtKey, () => React.ReactNode> = {
  cursors: CursorsMini,
  comments: CommentsMini,
  sharing: SharingMini,
  export: ExportMini,
};

/** Bento grid of secondary features, then a row of compact cards. */
export function Bento() {
  return (
    <Section labelledBy="more-heading">
      <SectionHeader
        id="more-heading"
        label={BENTO.label}
        title={BENTO.title}
        accent={BENTO.accent}
      />

      <div className="mt-[clamp(2.5rem,5vw,3.5rem)] grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {BENTO.cards.map((card) => (
          <BentoCard key={card.label} {...card} />
        ))}
      </div>

      <ul className="mt-5 grid gap-5 md:grid-cols-3">
        {BENTO.extras.map(({ icon: Icon, title, body }) => (
          <li key={title} className="card reveal flex items-start gap-4 rounded-2xl p-5">
            <IconTile size="lg">
              <Icon />
            </IconTile>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function BentoCard({
  icon: Icon,
  label,
  title,
  body,
  art,
  tall = false,
}: {
  icon: Glyph;
  label: string;
  title: string;
  body: string;
  art: BentoArtKey;
  tall?: boolean;
}) {
  const Art = ART[art];
  return (
    <article
      className={cn(
        "card reveal flex flex-col rounded-3xl p-6 text-center sm:p-7",
        tall && "lg:row-span-2",
      )}
    >
      <p className="mx-auto flex items-center gap-2.5 font-semibold">
        <IconTile>
          <Icon />
        </IconTile>
        {label}
      </p>
      <h3 className="font-display mt-5 text-xl leading-snug text-balance">{title}</h3>
      <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed text-balance">{body}</p>
      <div
        className="bg-primary-subtle/70 mt-6 flex flex-1 flex-col justify-center rounded-2xl p-4 text-left sm:p-5"
        aria-hidden
      >
        <Art />
      </div>
    </article>
  );
}
