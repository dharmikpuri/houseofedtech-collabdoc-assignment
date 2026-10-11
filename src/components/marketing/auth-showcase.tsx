import {
  GlyphCursor,
  GlyphHistory,
  GlyphMerge,
  GlyphOffline,
  GlyphUsers,
} from "@/components/brand/glyphs";
import { MergeArt } from "@/components/marketing/art/merge-art";
import { IconTile } from "@/components/ui/icon-tile";
import { SectionLabel } from "@/components/marketing/parts";

/**
 * Right-hand panel on the auth screens: the product's one idea — two edit
 * streams merging into one document — on a tinted stage.
 * Decorative; the form column carries all the meaning.
 */
export function AuthShowcase() {
  return (
    <div
      className="border-border bg-subtle relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-10 xl:p-14"
      aria-hidden
    >
      <div className="bg-wash pointer-events-none absolute inset-x-0 top-0 h-96" />
      <div className="bg-dotgrid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,#000_35%,#000_75%,transparent)]" />

      <div className="relative">
        <SectionLabel>Works offline</SectionLabel>
        <h2 className="font-display mt-5 max-w-md text-4xl leading-[1.1] xl:text-5xl">
          The workspace that keeps writing{" "}
          <span className="text-primary">when the network doesn&apos;t</span>
        </h2>
      </div>

      {/* The merge, as a card. */}
      <div className="border-border bg-surface relative mx-auto my-10 w-full max-w-md overflow-hidden rounded-2xl border shadow-lg">
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <p className="flex items-center gap-2.5 text-sm font-semibold">
            <IconTile size="sm" shape="rounded" className="size-7">
              <GlyphMerge />
            </IconTile>
            Merge
          </p>
          <span className="bg-success-subtle text-success rounded-full px-2 py-0.5 text-xs font-medium">
            0 conflicts
          </span>
        </div>
        <div className="h-52">
          <MergeArt />
        </div>
        <p className="border-border text-muted-foreground border-t px-4 py-3 text-sm">
          Edit on a laptop and a phone at once — even offline. Both edits survive.
        </p>
      </div>

      <ul className="relative grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {[
          { icon: <GlyphOffline />, label: "Works fully offline" },
          { icon: <GlyphCursor />, label: "Live cursors and comments" },
          { icon: <GlyphHistory />, label: "Version history you can restore" },
          { icon: <GlyphUsers />, label: "Role-based sharing" },
        ].map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 font-medium">
            <span className="text-primary">{item.icon}</span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
