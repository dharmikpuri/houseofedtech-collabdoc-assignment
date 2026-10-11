import { cn } from "@/lib/utils";
import { IconTile } from "@/components/ui/icon-tile";
import { DashboardMock } from "@/components/marketing/dashboard-mock";
import { BrowserFrame } from "@/components/marketing/parts";
import { Section, SectionHeader } from "@/components/marketing/section";
import { WORKSPACE, type Glyph } from "@/content/landing";

/** The dashboard in a browser frame on a tinted stage. */
export function WorkspaceShowcase() {
  return (
    <Section tone="subtle" labelledBy="workspace-heading">
      <SectionHeader
        id="workspace-heading"
        label={WORKSPACE.label}
        title={WORKSPACE.title}
        accent={WORKSPACE.accent}
        description={WORKSPACE.description}
      />

      <div className="relative mx-auto mt-[clamp(2.5rem,5vw,3.5rem)] w-full max-w-[72rem]">
        {WORKSPACE.tiles.map((tile) => (
          <FloatTile key={tile.title} {...tile} />
        ))}
        <div className="border-primary/15 bg-primary-subtle reveal rounded-[28px] border p-3 sm:p-6">
          <BrowserFrame url={WORKSPACE.frameUrl}>
            <DashboardMock />
          </BrowserFrame>
        </div>
      </div>
    </Section>
  );
}

/** Small product card floating beside the showcase. Wide screens only; decorative. */
function FloatTile({
  icon: Icon,
  title,
  detail,
  position,
}: {
  icon: Glyph;
  title: string;
  detail: string;
  /** Absolute-position classes relative to the stage. */
  position: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-surface absolute z-10 hidden items-center gap-3 rounded-2xl border py-3 pr-5 pl-3 shadow-lg min-[100rem]:flex",
        position,
      )}
      aria-hidden
    >
      <IconTile shape="rounded" className="rounded-xl">
        <Icon />
      </IconTile>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground block text-xs">{detail}</span>
      </span>
    </div>
  );
}
