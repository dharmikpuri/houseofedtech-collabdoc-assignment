import {
  GlyphBolt,
  GlyphCheck,
  GlyphDocument,
  GlyphHistory,
  GlyphLock,
  GlyphMerge,
  GlyphOffline,
  GlyphRestore,
  GlyphShield,
  GlyphSignal,
  GlyphSparkle,
} from "@/components/brand/glyphs";
import { FlowChip, FlowLine } from "@/components/marketing/parts";
import {
  AISHA,
  MARCO,
  PRIYA,
  Avatar,
  Card,
  Lines,
  Inserted,
  KeyStep,
} from "@/components/marketing/art/primitives";
import { cn } from "@/lib/utils";

/**
 * Feature illustrations for the landing page, drawn as small flow diagrams:
 * real interface pieces joined by dotted connectors, each showing what the
 * feature actually does step by step. Decorative — the copy beside each one
 * carries the meaning — and sized to stay legible down to a phone.
 */

// ── Offline ──────────────────────────────────────────────────────────────────

/** Editing with no connection: saved locally, queued, replayed in order. */
export function OfflineFlow() {
  const queue = ["Edited “Launch plan”", "Saved version “Draft 2”", "Added tag “launch”"];
  return (
    <div>
      <FlowChip icon={<GlyphOffline />}>Marco&apos;s phone · offline</FlowChip>
      <FlowLine className="ml-6 w-fit" />

      <div className="grid items-center gap-3 sm:grid-cols-[1.1fr_auto_1fr]">
        <Card className="p-3.5">
          <p className="flex items-center gap-1.5 text-[12px] font-bold">
            <GlyphDocument className="text-primary size-3.5" />
            Launch plan
          </p>
          <p className="mt-2 text-[12px] leading-relaxed">
            We ship on Friday<Inserted color={MARCO}>, after QA sign-off</Inserted>
            <span
              className="ml-px inline-block h-3.5 w-0.5 translate-y-0.5 animate-[caret-blink_1.1s_ease-in-out_infinite]"
              style={{ backgroundColor: MARCO }}
            />
          </p>
          <div className="mt-2.5">
            <Lines widths={["92%", "64%"]} />
          </div>
          <p className="bg-success-subtle text-success mt-3 flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-semibold">
            <GlyphCheck className="size-3" />
            Saved on this device
          </p>
        </Card>

        <FlowLine direction="right" className="hidden w-8 sm:flex" />

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              Sync queue
            </p>
            <span className="bg-warning-subtle text-warning rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
              3 waiting
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {queue.map((item, index) => (
              <li
                key={item}
                className="border-border bg-subtle flex animate-[queue-send_3.6s_ease-in-out_infinite] items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px]"
                style={{ animationDelay: `${index * 0.6}s` }}
              >
                <span className="text-muted-foreground font-mono text-[10px]">{index + 1}</span>
                <span className="truncate">{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex justify-end sm:pr-[22%]">
        <FlowLine />
      </div>
      <div className="flex justify-end">
        <KeyStep
          tone="success"
          icon={<GlyphSignal />}
          live
          title="Back online — synced"
          detail="Sent in order, each exactly once"
          className="w-full sm:w-auto"
        />
      </div>
    </div>
  );
}

// ── Merge ────────────────────────────────────────────────────────────────────

/** Two people edit the same sentence at once; both edits are kept. */
export function MergeFlow() {
  const editors = [
    { letter: "A", name: "Aisha", device: "Laptop", color: AISHA, edit: "+ the offline editor" },
    {
      letter: "M",
      name: "Marco",
      device: "Phone, offline",
      color: MARCO,
      edit: "+ after QA sign-off",
    },
  ];
  return (
    <div>
      <FlowChip icon={<GlyphMerge />}>Same paragraph, same moment</FlowChip>
      <FlowLine className="ml-6 w-fit" />

      <div className="grid items-center sm:grid-cols-[minmax(0,1fr)_2rem_minmax(0,0.85fr)]">
        <div className="space-y-3">
          {editors.map((editor) => (
            <Card key={editor.name} className="flex items-center gap-2.5 p-2.5">
              <Avatar letter={editor.letter} color={editor.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold">
                  {editor.name}{" "}
                  <span className="text-muted-foreground font-normal">· {editor.device}</span>
                </p>
                <span
                  className="mt-1 inline-block max-w-full truncate rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold"
                  style={{
                    color: editor.color,
                    backgroundColor: `color-mix(in oklab, ${editor.color} 13%, transparent)`,
                  }}
                >
                  {editor.edit}
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* Bracket joining both edits into the merge step */}
        <span className="border-foreground/35 relative hidden h-[52%] rounded-r-lg border-y-2 border-r-2 border-dotted sm:block">
          <span className="border-foreground/35 absolute top-1/2 left-full w-4 border-t-2 border-dotted" />
        </span>
        <FlowLine className="sm:hidden" />

        <KeyStep
          live
          icon={<GlyphBolt />}
          title="Merged automatically"
          detail="Any order"
          className="sm:ml-4"
        />
      </div>

      <div className="flex justify-end pr-[18%]">
        <FlowLine />
      </div>

      <div className="border-primary/20 bg-primary-subtle rounded-2xl border p-3">
        <Card className="p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[12px] font-bold">
              <GlyphDocument className="text-primary size-3.5" />
              Launch plan
            </p>
            <span className="bg-success-subtle text-success rounded-full px-2 py-0.5 text-[10.5px] font-semibold">
              0 conflicts
            </span>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed">
            We ship <Inserted color={AISHA}>the offline editor</Inserted> on Friday
            <Inserted color={MARCO}>, after QA sign-off</Inserted>.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="flex -space-x-1.5">
              <Avatar letter="A" color={AISHA} className="ring-surface size-5 ring-2" />
              <Avatar letter="M" color={MARCO} className="ring-surface size-5 ring-2" />
            </span>
            <span className="text-muted-foreground text-[10.5px]">Both edits kept</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── History ──────────────────────────────────────────────────────────────────

/** Named versions, a word-level compare, and a restore that loses nothing. */
export function HistoryFlow() {
  const versions = [
    { v: "v12", name: "Before review", who: "A", color: AISHA, when: "2 min ago", current: true },
    { v: "v11", name: "Pricing draft", who: "M", color: MARCO, when: "1 hour ago" },
    { v: "v10", name: "First outline", who: "P", color: PRIYA, when: "Tuesday", picked: true },
  ];
  return (
    <div>
      <FlowChip icon={<GlyphHistory />}>Version history</FlowChip>
      <FlowLine className="ml-6 w-fit" />

      <Card className="divide-border divide-y">
        {versions.map((version) => (
          <div key={version.v} className="flex items-center gap-2.5 px-3 py-2">
            <Avatar letter={version.who} color={version.color} className="size-5 text-[9px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold">{version.name}</p>
              <p className="text-muted-foreground text-[10.5px]">
                {version.v} · {version.when}
              </p>
            </div>
            {version.current && (
              <span className="bg-primary-subtle text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                Current
              </span>
            )}
            {version.picked && (
              <span className="border-primary/40 text-primary rounded-md border px-1.5 py-0.5 text-[10px] font-semibold">
                Compare
              </span>
            )}
          </div>
        ))}
      </Card>

      <div className="flex justify-end pr-[16%]">
        <FlowLine />
      </div>

      <div className="grid items-center gap-3 sm:grid-cols-[1.15fr_auto_1fr]">
        <Card className="p-3">
          <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
            v10 → current
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed">
            We ship on{" "}
            <span className="text-danger decoration-danger/60 line-through">Thursday</span>{" "}
            <span className="bg-success-subtle text-success rounded-[3px] px-0.5">Friday</span>
            <span className="bg-success-subtle text-success rounded-[3px] px-0.5">
              , after QA sign-off
            </span>
            .
          </p>
        </Card>

        <FlowLine direction="right" className="hidden w-8 sm:flex" />

        <KeyStep
          live
          icon={<GlyphRestore />}
          title="Restore v10"
          detail="Current draft saved first"
        />
      </div>
    </div>
  );
}

// ── AI ───────────────────────────────────────────────────────────────────────

/** A question answered from the asker's documents — and only theirs. */
export function AskFlow() {
  const sources = [
    { n: 1, title: "Launch plan", open: true },
    { n: 2, title: "Rollout sheet", open: true },
    { n: 0, title: "Salary bands", open: false },
  ];
  return (
    <div>
      <FlowChip icon={<GlyphSparkle />}>Ask your workspace</FlowChip>
      <FlowLine className="ml-6 w-fit" />

      <Card className="flex items-center gap-2.5 p-2.5">
        <Avatar letter="P" color={PRIYA} />
        <p className="flex-1 text-[12.5px] font-medium">What&apos;s still blocking the launch?</p>
        <span className="bg-primary-solid hidden rounded-md px-2 py-1 text-[10.5px] font-semibold text-white sm:inline">
          Ask
        </span>
      </Card>

      <FlowLine className="ml-6 w-fit" />

      <div className="border-primary/60 bg-surface rounded-xl border-2 p-3.5 shadow-sm">
        <p className="text-primary flex items-center gap-1.5 text-[12px] font-bold">
          <GlyphSparkle className="size-3.5" />
          Answer
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed">
          Only the share-link security review is still open
          <sup className="text-primary ml-0.5 font-bold">1</sup>. Rollout regions are agreed but not
          yet listed<sup className="text-primary ml-0.5 font-bold">2</sup>.
          <span className="bg-primary ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 animate-[caret-blink_1.1s_ease-in-out_infinite]" />
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {sources.map((source) => (
          <div key={source.title} className="flex flex-col items-center">
            <FlowLine className={cn(!source.open && "opacity-40")} />
            <Card
              className={cn("w-full p-2", !source.open && "bg-subtle border-dashed shadow-none")}
            >
              <p className="flex items-start gap-1 text-[11px] font-semibold">
                {source.open ? (
                  <span className="text-primary font-bold">{source.n}</span>
                ) : (
                  <GlyphLock className="text-muted-foreground size-3" />
                )}
                <span className={cn("leading-tight", !source.open && "text-muted-foreground")}>
                  {source.title}
                </span>
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[10px] leading-tight",
                  source.open ? "text-success" : "text-muted-foreground",
                )}
              >
                {source.open ? "You can open" : "Not shared with you"}
              </p>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Security ─────────────────────────────────────────────────────────────────

/** Who can open a document, and what each person may do in it. */
export function SecurityFlow() {
  const people = [
    { letter: "A", name: "Aisha", role: "Owner", can: "Full access", color: AISHA, allowed: true },
    { letter: "M", name: "Marco", role: "Editor", can: "Can edit", color: MARCO, allowed: true },
    { letter: "P", name: "Priya", role: "Viewer", can: "Can view", color: PRIYA, allowed: true },
    { letter: "?", name: "Anyone else", role: "", can: "No access", color: "", allowed: false },
  ];
  return (
    <div>
      <FlowChip icon={<GlyphShield />}>Who can open “Launch plan”</FlowChip>
      <FlowLine className="ml-6 w-fit" />

      <Card className="divide-border divide-y">
        {people.map((person, index) => (
          <div key={person.name} className="flex items-center gap-3 px-3 py-2.5">
            {person.allowed ? (
              <Avatar letter={person.letter} color={person.color} />
            ) : (
              <span className="border-border-strong text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed text-[10px] font-bold">
                ?
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[12.5px] font-bold",
                  !person.allowed && "text-muted-foreground",
                )}
              >
                {person.name}
                {person.role && (
                  <span className="text-muted-foreground ml-1.5 font-normal">· {person.role}</span>
                )}
              </p>
              <p className="text-muted-foreground text-[11px]">{person.can}</p>
            </div>
            {person.allowed ? (
              <span
                className="text-success flex animate-[check-pop_4.2s_ease-out_infinite]"
                style={{ animationDelay: `${index * 0.45}s` }}
              >
                <GlyphCheck className="size-[18px]" />
              </span>
            ) : (
              <GlyphLock className="text-muted-foreground size-4" />
            )}
          </div>
        ))}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center">
          <FlowLine />
          <KeyStep
            tone="success"
            icon={<GlyphCheck />}
            title="Marco edits"
            detail="Saved for everyone"
            className="w-full"
          />
        </div>
        <div className="flex flex-col items-center">
          <FlowLine />
          <KeyStep
            tone="danger"
            icon={<GlyphLock />}
            title="Priya edits"
            detail="View only — blocked"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
