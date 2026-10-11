import { GlyphCheck, GlyphDocument } from "@/components/brand/glyphs";
import { AISHA, MARCO, PRIYA, Avatar, Card, Lines } from "@/components/marketing/art/primitives";

/** Small product visuals for the landing page's bento cards. Decorative. */

/** Several people in one document, each with a named caret. */
export function CursorsMini() {
  const people = [
    { letter: "A", name: "Aisha", status: "Editing", color: AISHA },
    { letter: "M", name: "Marco", status: "Offline · 2 edits queued", color: MARCO },
    { letter: "P", name: "Priya", status: "Viewing", color: PRIYA },
  ];
  return (
    <div className="space-y-3">
      <Card className="divide-border divide-y">
        {people.map((person) => (
          <div key={person.name} className="flex items-center gap-2.5 px-3 py-2">
            <Avatar letter={person.letter} color={person.color} className="size-5 text-[9px]" />
            <p className="text-[12px] font-semibold">{person.name}</p>
            <p className="text-muted-foreground ml-auto truncate text-[10.5px]">{person.status}</p>
          </div>
        ))}
      </Card>
      <CursorsDoc />
    </div>
  );
}

function CursorsDoc() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12px] font-bold">
          <GlyphDocument className="text-primary size-3.5" />
          Q4 roadmap
        </p>
        <span className="flex -space-x-1.5">
          <Avatar letter="A" color={AISHA} className="ring-surface size-5 ring-2" />
          <Avatar letter="M" color={MARCO} className="ring-surface size-5 ring-2" />
          <Avatar letter="P" color={PRIYA} className="ring-surface size-5 ring-2" />
        </span>
      </div>
      <p className="mt-6 text-[12.5px] leading-7">
        Ship sync to every workspace
        <NamedCaret name="Aisha" color={AISHA} />, then{" "}
        <span
          className="rounded-[3px]"
          style={{ backgroundColor: `color-mix(in oklab, ${MARCO} 18%, transparent)` }}
        >
          open the beta
        </span>
        <NamedCaret name="Marco" color={MARCO} /> to partners.
      </p>
      <div className="mt-3">
        <Lines widths={["86%", "58%"]} />
      </div>
    </Card>
  );
}

function NamedCaret({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="relative mx-px inline-block h-4 w-0.5 translate-y-[3px]"
      style={{ backgroundColor: color }}
    >
      <span
        className="absolute bottom-full left-0 rounded-[3px] rounded-bl-none px-1 py-px text-[9.5px] leading-3 font-semibold whitespace-nowrap text-white"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </span>
  );
}

/** A comment thread anchored to a phrase, with a mention. */
export function CommentsMini() {
  return (
    <div className="space-y-2">
      <p className="text-[12px] leading-relaxed">
        Launch moves to{" "}
        <span className="border-warning bg-warning-subtle border-b-2 px-0.5">November 18</span> for
        all workspaces.
      </p>
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <Avatar letter="P" color={PRIYA} className="size-5 text-[9px]" />
          <p className="text-[11.5px] font-bold">Priya</p>
          <span className="text-muted-foreground text-[10px]">now</span>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed">
          <span className="text-primary font-semibold">@Marco</span> can you confirm QA is done by
          then?
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-muted-foreground text-[10px]">2 replies</span>
          <span className="border-border rounded-md border px-1.5 py-0.5 text-[10px] font-semibold">
            Resolve
          </span>
        </div>
      </Card>
    </div>
  );
}

/** Inviting a teammate, and what each role may do. */
export function SharingMini() {
  const caps = [
    { label: "View", roles: [true, true, true] },
    { label: "Edit", roles: [true, true, false] },
    { label: "Share", roles: [true, false, false] },
    { label: "Delete", roles: [true, false, false] },
  ];
  return (
    <div className="space-y-3">
      <Card className="p-3">
        <p className="text-[12px] font-bold">Invite to “Launch plan”</p>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="border-border bg-subtle text-muted-foreground min-w-0 flex-1 truncate rounded-md border px-2 py-1.5 text-[11px]">
            marco@team.dev
          </span>
          <span className="border-border rounded-md border px-2 py-1.5 text-[11px] font-semibold">
            Editor
          </span>
          <span className="bg-primary-solid rounded-md px-2 py-1.5 text-[11px] font-semibold text-white">
            Invite
          </span>
        </div>
      </Card>
      <Card className="overflow-hidden text-[11px]">
        <div className="bg-subtle text-muted-foreground border-border grid grid-cols-[1fr_repeat(3,3rem)] border-b px-3 py-2 font-semibold">
          <span>Role</span>
          <span className="text-center">Owner</span>
          <span className="text-center">Editor</span>
          <span className="text-center">Viewer</span>
        </div>
        {caps.map((cap) => (
          <div
            key={cap.label}
            className="border-border grid grid-cols-[1fr_repeat(3,3rem)] items-center border-b px-3 py-1.5 last:border-0"
          >
            <span className="font-medium">{cap.label}</span>
            {cap.roles.map((allowed, index) => (
              <span key={index} className="flex justify-center">
                {allowed ? (
                  <GlyphCheck className="text-primary size-4" />
                ) : (
                  <span className="bg-border-strong h-0.5 w-2.5 rounded-full" />
                )}
              </span>
            ))}
          </div>
        ))}
      </Card>
    </div>
  );
}

/** The formats a document goes out (and comes in) as. */
export function ExportMini() {
  const formats = [
    { ext: "MD", label: "Markdown" },
    { ext: "HTML", label: "Web page" },
    { ext: "PDF", label: "Print" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {formats.map((format) => (
        <Card key={format.ext} className="flex flex-col items-center gap-1.5 px-2 py-3">
          <span className="bg-primary-subtle text-primary rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-bold">
            .{format.ext.toLowerCase()}
          </span>
          <span className="text-muted-foreground text-[10.5px]">{format.label}</span>
        </Card>
      ))}
    </div>
  );
}
