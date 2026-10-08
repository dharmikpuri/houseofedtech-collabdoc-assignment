import { cn } from "@/lib/utils";

/**
 * "Online-only editor" versus CollabDoc, shown the way the product shows any
 * change: as a diff. Removed lines are what a typical editor does; added lines
 * are what replaces them here.
 */

const CHANGES: { removed: string; added: string }[] = [
  {
    removed: "Every edit waits on a round-trip to a server",
    added: "Every edit lands on your device first — 0 ms of network",
  },
  {
    removed: "Offline means a “Reconnecting…” banner and a frozen page",
    added: "Offline means you keep writing; changes queue on the device",
  },
  {
    removed: "Last write wins: one person's paragraph is overwritten",
    added: "CRDT merge: both people's edits survive, in any order",
  },
  {
    removed: "“Keep yours or theirs?” conflict dialogs",
    added: "No conflict dialogs — convergence is guaranteed by construction",
  },
  {
    removed: "Restoring a version wipes what was written since",
    added: "Restoring replays the past as a new edit; nothing is lost",
  },
];

export function DiffComparison({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-border bg-surface overflow-hidden rounded-xl border shadow-md",
        className,
      )}
    >
      <div className="border-border bg-subtle flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <p className="text-muted-foreground truncate text-sm font-medium">
          Typical online editor <span aria-hidden>→</span> CollabDoc
        </p>
        <p className="shrink-0 font-mono text-xs font-semibold">
          <span className="text-danger">−{CHANGES.length}</span>{" "}
          <span className="text-success">+{CHANGES.length}</span>
        </p>
      </div>

      <ol className="divide-border divide-y text-[15px]">
        {CHANGES.map((change, index) => (
          <li key={change.added}>
            <Line kind="removed" number={index + 1}>
              {change.removed}
            </Line>
            <Line kind="added" number={index + 1}>
              {change.added}
            </Line>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Line({
  kind,
  number,
  children,
}: {
  kind: "removed" | "added";
  number: number;
  children: React.ReactNode;
}) {
  const removed = kind === "removed";
  return (
    <p
      className={cn(
        "flex items-start gap-3 px-4 py-2.5",
        removed ? "bg-danger-subtle/60" : "bg-success-subtle/70",
      )}
    >
      <span
        className="text-muted-foreground/70 w-4 shrink-0 pt-0.5 text-right font-mono text-xs"
        aria-hidden
      >
        {number}
      </span>
      <span
        className={cn(
          "w-3 shrink-0 font-mono font-semibold",
          removed ? "text-danger" : "text-success",
        )}
        aria-hidden
      >
        {removed ? "−" : "+"}
      </span>
      <span className="sr-only">{removed ? "Typical editor: " : "CollabDoc: "}</span>
      <span
        className={cn(
          "leading-relaxed",
          removed ? "text-muted-foreground decoration-danger/40 line-through" : "text-foreground",
        )}
      >
        {children}
      </span>
    </p>
  );
}
