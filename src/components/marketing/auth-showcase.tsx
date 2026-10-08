import { Check, GitMerge } from "lucide-react";

import { MergeArt } from "@/components/marketing/feature-art";
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
        <SectionLabel>Local-first workspace</SectionLabel>
        <h2 className="font-display mt-5 max-w-md text-4xl leading-[1.1] xl:text-5xl">
          The workspace that keeps writing{" "}
          <span className="text-primary">when the network doesn&apos;t</span>
        </h2>
      </div>

      {/* The merge, as a card. */}
      <div className="border-border bg-surface relative mx-auto my-10 w-full max-w-md overflow-hidden rounded-2xl border shadow-lg">
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <p className="flex items-center gap-2.5 text-sm font-semibold">
            <span className="bg-primary-subtle text-primary flex size-7 items-center justify-center rounded-lg">
              <GitMerge className="size-4" />
            </span>
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
          "Works fully offline",
          "Live cursors and comments",
          "Version history you can restore",
          "Role-based sharing",
        ].map((label) => (
          <li key={label} className="flex items-center gap-2.5">
            <span className="bg-primary-subtle text-primary flex size-5 shrink-0 items-center justify-center rounded-full">
              <Check className="size-3" strokeWidth={3} />
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
