"use client";

import { useState } from "react";
import { GitMerge, History, Users, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { HistoryArt, MergeArt, OfflineArt, RolesArt } from "@/components/marketing/feature-art";

const SECTIONS = [
  {
    id: "offline",
    icon: WifiOff,
    title: "Offline-first editing",
    body: "Every keystroke saves to your device first. Open, edit and organise with no connection at all — offline actions queue and replay in order when you're back.",
    panel: "Local store",
    caption: "Edits land in IndexedDB; nothing waits on the network.",
    Art: OfflineArt,
  },
  {
    id: "sync",
    icon: GitMerge,
    title: "Real-time sync that can't conflict",
    body: "Documents are CRDTs, so concurrent edits converge to the same result on every device, in any order. Live cursors show who is where.",
    panel: "Merge",
    caption: "Two people edit the same sentence; one result.",
    Art: MergeArt,
  },
  {
    id: "history",
    icon: History,
    title: "Version history you can trust",
    body: "Named snapshots with author and time. Restoring keeps your current draft and replays the past as a new edit, so nobody is overwritten.",
    panel: "Version history",
    caption: "Restore is a forward edit, never a rollback.",
    Art: HistoryArt,
  },
  {
    id: "roles",
    icon: Users,
    title: "Sharing with real permissions",
    body: "Owner, Editor and Viewer come from one capability matrix — enforced by the API, the real-time server and the database, not just the interface.",
    panel: "Access",
    caption: "One matrix, three enforcement layers.",
    Art: RolesArt,
  },
] as const;

/**
 * The core features as an accordion list with a visual. Only the open item
 * shows its description, so the list stays scannable.
 */
export function FeatureOutline() {
  const [active, setActive] = useState(0);
  const current = SECTIONS[active]!;

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
      <div
        role="tablist"
        aria-label="Core features"
        aria-orientation="vertical"
        className="space-y-2"
      >
        {SECTIONS.map((section, index) => {
          const selected = index === active;
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              id={`feature-tab-${section.id}`}
              aria-selected={selected}
              aria-controls="feature-panel"
              onClick={() => setActive(index)}
              className={cn(
                "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-[background-color,border-color,box-shadow] sm:p-5",
                selected
                  ? "border-border bg-surface shadow-md"
                  : "hover:bg-surface/60 border-transparent",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                  selected ? "bg-primary-solid text-white" : "bg-primary-subtle text-primary",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 pt-1.5">
                <span className="font-display block text-lg leading-snug">{section.title}</span>
                {selected && (
                  <span className="text-muted-foreground mt-1.5 block animate-[fade-in_0.3s_ease-out] text-[15px] leading-relaxed">
                    {section.body}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* The visual for the open item, on a dotted stage. */}
      <div
        id="feature-panel"
        role="tabpanel"
        aria-labelledby={`feature-tab-${current.id}`}
        className="border-border bg-surface overflow-hidden rounded-3xl border shadow-lg"
      >
        <div className="border-border flex items-center justify-between border-b px-5 py-3.5">
          <p className="flex items-center gap-2.5 text-sm font-semibold">
            <span className="bg-primary-subtle text-primary flex size-7 items-center justify-center rounded-lg">
              <current.icon className="size-4" aria-hidden />
            </span>
            {current.panel}
          </p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {active + 1} of {SECTIONS.length}
          </p>
        </div>
        <div
          key={current.id}
          className="bg-subtle relative h-72 animate-[fade-in_0.3s_ease-out] sm:h-80"
          aria-hidden
        >
          <div className="bg-dotgrid absolute inset-0" />
          <div className="relative h-full sm:[zoom:1.25]">
            <current.Art />
          </div>
        </div>
        <p className="border-border text-muted-foreground border-t px-5 py-3.5 text-sm">
          {current.caption}
        </p>
      </div>
    </div>
  );
}
