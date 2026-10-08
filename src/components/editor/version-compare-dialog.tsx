"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import {
  AlertCircle,
  ArrowLeftRight,
  Columns2,
  Equal,
  Loader2,
  RotateCcw,
  Rows3,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { diffDocuments, type Block, type DiffRow, type Segment } from "@/lib/diff/document-diff";
import { fetchVersionContent, VersionFetchError } from "@/lib/versions/client";
import type { VersionSummary } from "@/components/editor/versions-panel";

const CURRENT = "current";

export type CompareRequest = {
  /** The saved version the user clicked "Compare" on. */
  baseId: string;
  /** Snapshot of the live draft taken when the dialog opened. */
  currentContent: JSONContent;
};

/**
 * Side-by-side / redline comparison between two versions of a document.
 *
 * The left side is always a saved version (it's what "What changed?" and
 * "Restore" operate on). The right side is either the current draft or another
 * saved version. The live draft is snapshotted when the dialog opens, so the
 * comparison doesn't shift under the reader while collaborators keep typing.
 */
export function VersionCompareDialog({
  documentId,
  versions,
  request,
  onClose,
  aiEnabled,
  canRestore,
  onRestore,
}: {
  documentId: string;
  versions: VersionSummary[];
  request: CompareRequest | null;
  onClose: () => void;
  aiEnabled: boolean;
  canRestore: boolean;
  onRestore: (version: VersionSummary) => void;
}) {
  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        {request && (
          // Keyed so each opening starts from clean state instead of resetting
          // it in an effect.
          <CompareBody
            key={`${request.baseId}`}
            documentId={documentId}
            versions={versions}
            request={request}
            aiEnabled={aiEnabled}
            canRestore={canRestore}
            onRestore={(version) => {
              onClose();
              onRestore(version);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CompareBody({
  documentId,
  versions,
  request,
  aiEnabled,
  canRestore,
  onRestore,
}: {
  documentId: string;
  versions: VersionSummary[];
  request: CompareRequest;
  aiEnabled: boolean;
  canRestore: boolean;
  onRestore: (version: VersionSummary) => void;
}) {
  const [baseId, setBaseId] = useState(request.baseId);
  const [targetId, setTargetId] = useState<string>(CURRENT);
  const [view, setView] = useState<"unified" | "split">("unified");
  const [onlyChanges, setOnlyChanges] = useState(true);

  const [contents, setContents] = useState<Record<string, JSONContent>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Bumped by "Try again" so the loader re-runs even though the ids are the same.
  const [attempt, setAttempt] = useState(0);

  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const baseVersion = versions.find((v) => v.id === baseId);
  const needed = [baseId, targetId].filter((id) => id !== CURRENT);

  // Fetch whichever side isn't loaded yet. Loading state is derived (neither
  // content nor error present) so nothing is set synchronously here.
  useEffect(() => {
    let cancelled = false;
    for (const id of needed) {
      if (contents[id] || errors[id]) continue;
      fetchVersionContent(documentId, id)
        .then((content) => {
          if (!cancelled) setContents((prev) => ({ ...prev, [id]: content }));
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          const message =
            error instanceof VersionFetchError ? error.message : "Could not load this version.";
          setErrors((prev) => ({ ...prev, [id]: message }));
        });
    }
    return () => {
      cancelled = true;
    };
    // `needed` derives from the two ids; `contents`/`errors` are read only to
    // skip work already done, so they deliberately don't retrigger the load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, baseId, targetId, attempt]);

  const left = contents[baseId];
  const right = targetId === CURRENT ? request.currentContent : contents[targetId];
  const loadError = errors[baseId] ?? (targetId !== CURRENT ? errors[targetId] : undefined);
  const loading = !loadError && (!left || !right);
  const sameSelection = baseId === targetId;

  const diff = useMemo(
    () => (left && right && !sameSelection ? diffDocuments(left, right) : null),
    [left, right, sameSelection],
  );

  const pairKey = `${baseId}->${targetId}`;
  const summary = summaries[pairKey];

  function retryLoad() {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[baseId];
      delete next[targetId];
      return next;
    });
    setAttempt((value) => value + 1);
  }

  async function summarize() {
    if (!right || summarizing) return;
    setSummarizing(true);
    setSummaryError(null);
    try {
      // The summary endpoint compares a stored version against any supplied
      // content, so it covers version-vs-draft and version-vs-version alike.
      const res = await fetch(
        `/api/documents/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(baseId)}/summary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentContent: right }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { summary?: string; error?: string };
      if (res.ok && data.summary) setSummaries((prev) => ({ ...prev, [pairKey]: data.summary! }));
      else setSummaryError(data.error ?? "Could not summarise these changes.");
    } catch {
      setSummaryError("You appear to be offline. AI features need a connection.");
    } finally {
      setSummarizing(false);
    }
  }

  const versionLabel = (v: VersionSummary) =>
    `${v.label} — ${new Date(v.createdAt).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })}`;

  return (
    <>
      <div className="border-border border-b px-5 pt-5 pb-4 sm:px-6">
        <DialogHeader className="mb-4">
          <DialogTitle>Compare versions</DialogTitle>
          <DialogDescription>
            Additions are highlighted in green, removals struck through in red.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <label className="min-w-0 flex-1 text-xs">
            <span className="text-muted-foreground mb-1 block font-medium">From</span>
            <select
              value={baseId}
              onChange={(event) => setBaseId(event.target.value)}
              className="border-border bg-input h-9 w-full rounded-md border px-2 text-sm"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {versionLabel(v)}
                </option>
              ))}
            </select>
          </label>

          <Button
            variant="ghost"
            size="icon"
            className="hidden self-end md:inline-flex"
            onClick={() => {
              setBaseId(targetId);
              setTargetId(baseId);
            }}
            // The left side must be a saved version, so "current draft" can't
            // move there.
            disabled={targetId === CURRENT}
            aria-label="Swap sides"
            title={targetId === CURRENT ? "The current draft can only be on the right" : "Swap"}
          >
            <ArrowLeftRight />
          </Button>

          <label className="min-w-0 flex-1 text-xs">
            <span className="text-muted-foreground mb-1 block font-medium">To</span>
            <select
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              className="border-border bg-input h-9 w-full rounded-md border px-2 text-sm"
            >
              <option value={CURRENT}>Current draft</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {versionLabel(v)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs">
            {diff && (
              <>
                <span className="text-success font-medium tabular-nums">
                  +{diff.stats.wordsAdded} words
                </span>
                <span className="text-danger font-medium tabular-nums">
                  −{diff.stats.wordsRemoved} words
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {diff.stats.blocksChanged} block{diff.stats.blocksChanged === 1 ? "" : "s"}{" "}
                  changed
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-muted-foreground flex cursor-pointer items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={onlyChanges}
                onChange={(event) => setOnlyChanges(event.target.checked)}
                className="accent-primary"
              />
              Only changes
            </label>
            <div
              className="border-border bg-surface ml-2 hidden items-center gap-0.5 rounded-md border p-0.5 md:flex"
              role="group"
              aria-label="Comparison layout"
            >
              <ViewButton
                active={view === "unified"}
                onClick={() => setView("unified")}
                label="Unified"
                icon={<Rows3 />}
              />
              <ViewButton
                active={view === "split"}
                onClick={() => setView("split")}
                label="Side by side"
                icon={<Columns2 />}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        {sameSelection ? (
          <Notice icon={<Equal />} text="Pick two different versions to compare." />
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Notice icon={<AlertCircle />} text={loadError} tone="danger" />
            <Button variant="secondary" size="sm" onClick={retryLoad}>
              Try again
            </Button>
          </div>
        ) : loading || !diff ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span role="status">Loading versions…</span>
          </div>
        ) : diff.stats.blocksChanged === 0 ? (
          <Notice icon={<Equal />} text="No differences — these versions have identical text." />
        ) : (
          <>
            {diff.approximate && (
              <p className="border-warning/30 bg-warning-subtle text-warning mb-3 rounded-md border px-3 py-2 text-xs">
                This comparison is very large, so some sections are shown as whole blocks removed
                and added rather than word by word.
              </p>
            )}
            {/* Split view needs horizontal room; small screens always get the
                unified redline. */}
            <div className={cn(view === "split" && "md:hidden")}>
              <UnifiedView rows={diff.rows} onlyChanges={onlyChanges} />
            </div>
            {view === "split" && (
              <div className="hidden md:block">
                <SplitView rows={diff.rows} onlyChanges={onlyChanges} />
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-border bg-surface flex flex-col gap-3 border-t px-5 py-3 sm:px-6">
        {(summary || summaryError) && (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-xs leading-relaxed whitespace-pre-line",
              summaryError
                ? "border-danger/30 bg-danger-subtle text-danger"
                : "border-border bg-muted/50",
            )}
          >
            {summaryError ?? summary}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {aiEnabled && !sameSelection ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void summarize()}
              loading={summarizing}
              disabled={!right || !!summary}
            >
              {!summarizing && <Sparkles />}
              {summary ? "Summarised" : "Summarise with AI"}
            </Button>
          ) : (
            <span />
          )}

          {canRestore && baseVersion && (
            <Button size="sm" onClick={() => onRestore(baseVersion)}>
              <RotateCcw />
              Restore “{baseVersion.label}”
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Rendering ────────────────────────────────────────────────────────────────

type Item = { type: "row"; row: DiffRow } | { type: "gap"; count: number };

/** Collapses runs of unchanged blocks into a "N unchanged" marker. */
function collapse(rows: DiffRow[], onlyChanges: boolean): Item[] {
  if (!onlyChanges) return rows.map((row) => ({ type: "row", row }));
  const items: Item[] = [];
  let run = 0;
  for (const row of rows) {
    if (row.kind === "same") {
      run += 1;
      continue;
    }
    if (run) items.push({ type: "gap", count: run });
    run = 0;
    items.push({ type: "row", row });
  }
  if (run) items.push({ type: "gap", count: run });
  return items;
}

function UnifiedView({ rows, onlyChanges }: { rows: DiffRow[]; onlyChanges: boolean }) {
  return (
    <div className="space-y-2">
      {collapse(rows, onlyChanges).map((item, index) =>
        item.type === "gap" ? (
          <Gap key={`gap-${index}`} count={item.count} />
        ) : (
          <Fragment key={index}>
            {item.row.kind === "same" && <BlockView block={item.row.block} />}
            {item.row.kind === "added" && <BlockView block={item.row.block} tone="added" />}
            {item.row.kind === "removed" && <BlockView block={item.row.block} tone="removed" />}
            {item.row.kind === "changed" && (
              <BlockShell block={item.row.after} tone="changed">
                <Segments segments={item.row.segments} show={["equal", "delete", "insert"]} />
              </BlockShell>
            )}
          </Fragment>
        ),
      )}
    </div>
  );
}

function SplitView({ rows, onlyChanges }: { rows: DiffRow[]; onlyChanges: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        From
      </p>
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">To</p>
      {collapse(rows, onlyChanges).map((item, index) => {
        if (item.type === "gap") {
          return (
            <div key={`gap-${index}`} className="col-span-2">
              <Gap count={item.count} />
            </div>
          );
        }
        const { row } = item;
        return (
          <Fragment key={index}>
            <div>
              {row.kind === "same" && <BlockView block={row.block} />}
              {row.kind === "removed" && <BlockView block={row.block} tone="removed" />}
              {row.kind === "added" && <Placeholder />}
              {row.kind === "changed" && (
                <BlockShell block={row.before} tone="changed">
                  <Segments segments={row.segments} show={["equal", "delete"]} />
                </BlockShell>
              )}
            </div>
            <div>
              {row.kind === "same" && <BlockView block={row.block} />}
              {row.kind === "added" && <BlockView block={row.block} tone="added" />}
              {row.kind === "removed" && <Placeholder />}
              {row.kind === "changed" && (
                <BlockShell block={row.after} tone="changed">
                  <Segments segments={row.segments} show={["equal", "insert"]} />
                </BlockShell>
              )}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

type Tone = "added" | "removed" | "changed";

const TONE_STYLES: Record<Tone, string> = {
  added: "border-success/40 bg-success-subtle",
  removed: "border-danger/40 bg-danger-subtle",
  changed: "border-border-strong bg-muted/30",
};

function BlockShell({
  block,
  tone,
  children,
}: {
  block: Block;
  tone?: Tone;
  children: React.ReactNode;
}) {
  if (block.type === "rule") {
    return <hr className={cn("border-border my-3", tone === "removed" && "border-danger")} />;
  }

  const listMarker =
    block.type !== "list"
      ? null
      : block.checked !== undefined
        ? block.checked
          ? "☑"
          : "☐"
        : block.ordered
          ? "1."
          : "•";

  return (
    <div
      className={cn(
        "rounded-md border-l-2 px-3 py-1.5 text-sm leading-relaxed",
        tone ? TONE_STYLES[tone] : "border-transparent",
        block.type === "heading" && "font-semibold",
        block.type === "heading" && block.level === 1 && "text-lg",
        block.type === "heading" && block.level === 2 && "text-base",
        block.type === "quote" && "text-muted-foreground italic",
        block.type === "code" && "font-mono text-xs whitespace-pre-wrap",
      )}
      style={
        block.type === "list"
          ? { paddingLeft: `${0.75 + (block.depth ?? 0) * 1.25}rem` }
          : undefined
      }
    >
      {tone === "added" && <span className="sr-only">Added: </span>}
      {tone === "removed" && <span className="sr-only">Removed: </span>}
      {listMarker && (
        <span className="text-muted-foreground mr-1.5" aria-hidden>
          {listMarker}
        </span>
      )}
      <span className="whitespace-pre-wrap">{children}</span>
    </div>
  );
}

function BlockView({ block, tone }: { block: Block; tone?: Tone }) {
  return (
    <BlockShell block={block} tone={tone}>
      <span
        className={cn(
          tone === "removed" && "text-danger line-through decoration-1",
          tone === "added" && "text-success",
          !tone && "text-muted-foreground",
        )}
      >
        {block.text}
      </span>
    </BlockShell>
  );
}

function Segments({ segments, show }: { segments: Segment[]; show: Segment["type"][] }) {
  return (
    <>
      {segments
        .filter((segment) => show.includes(segment.type))
        .map((segment, index) => {
          if (segment.type === "insert") {
            return (
              <ins
                key={index}
                className="bg-success-subtle text-success rounded-sm px-0.5 no-underline"
              >
                {segment.text}
              </ins>
            );
          }
          if (segment.type === "delete") {
            return (
              <del
                key={index}
                className="bg-danger-subtle text-danger rounded-sm px-0.5 decoration-1"
              >
                {segment.text}
              </del>
            );
          }
          return <span key={index}>{segment.text}</span>;
        })}
    </>
  );
}

function Gap({ count }: { count: number }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 py-1 text-[11px]">
      <span className="bg-border h-px flex-1" aria-hidden />
      {count} unchanged block{count === 1 ? "" : "s"}
      <span className="bg-border h-px flex-1" aria-hidden />
    </div>
  );
}

function Placeholder() {
  return (
    <div className="border-border h-full min-h-8 rounded-md border border-dashed" aria-hidden />
  );
}

function Notice({
  icon,
  text,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  text: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <p
      className={cn(
        "flex items-center justify-center gap-2 py-10 text-center text-sm [&_svg]:size-4",
        tone === "danger" ? "text-danger" : "text-muted-foreground",
      )}
    >
      {icon}
      {text}
    </p>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "rounded-[5px] p-1.5 transition-colors [&_svg]:size-4",
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}
