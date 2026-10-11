"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Editor } from "@tiptap/react";
import { GitCompare, History, RotateCcw, Save } from "lucide-react";
import { toast } from "react-toastify";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { confirmToast } from "@/components/ui/confirm-toast";
import { OutboxList } from "@/components/sync/outbox-list";
import {
  VersionCompareDialog,
  type CompareRequest,
} from "@/components/editor/version-compare-dialog";
import { createMutationId, enqueueAndWait } from "@/lib/outbox/outbox";
import { useOutbox } from "@/lib/outbox/use-outbox";
import { fetchVersionContent, VersionFetchError } from "@/lib/versions/client";
import { MAX_VERSION_CONTENT_BYTES } from "@/lib/validation/version";

export type VersionSummary = {
  id: string;
  label: string;
  authorName: string;
  createdAt: string;
};

/** Server-side label limit (see createVersionSchema). */
const MAX_LABEL = 120;

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

/**
 * Version history timeline.
 *
 * Saving a version goes through the offline mutation queue, so it works with
 * no connection: the snapshot is captured immediately, shown as "waiting to
 * sync", and delivered (idempotently) when the network returns.
 *
 * Restore is deliberately online-only and non-destructive. It first snapshots
 * the current draft *on the server* — a queued snapshot wouldn't be a real
 * safety net yet — then applies the old content as a forward edit, so
 * collaborators see a normal change they can undo rather than a document
 * silently rewritten underneath them.
 */
export function VersionsPanel({
  documentId,
  editor,
  canManage,
  aiEnabled,
  initialVersions,
}: {
  documentId: string;
  editor: Editor | null;
  canManage: boolean;
  aiEnabled: boolean;
  initialVersions: VersionSummary[];
}) {
  const [versions, setVersions] = useState<VersionSummary[]>(initialVersions);
  const [busy, setBusy] = useState(false);
  const [naming, setNaming] = useState(false);
  const [label, setLabel] = useState("");
  const [compare, setCompare] = useState<CompareRequest | null>(null);

  const { items, authPaused } = useOutbox();
  const queued = items.filter((m) => m.kind === "version.create" && m.documentId === documentId);
  const pendingCount = queued.filter((m) => m.status === "pending").length;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/versions`);
      if (res.ok) {
        const data = (await res.json()) as { versions: VersionSummary[] };
        setVersions(data.versions);
      }
    } catch {
      // Offline: keep showing what we have; the next delivery refreshes again.
    }
  }, [documentId]);

  // The panel mounts each time it's opened; the server-rendered list it starts
  // from may be stale by then (versions saved earlier in this session, or by
  // collaborators), so refresh on open.
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  // A queued snapshot leaving the pending state means it was delivered (by
  // this tab, another tab, or in the background) — pull the real list.
  const previousPending = useRef(pendingCount);
  useEffect(() => {
    if (pendingCount < previousPending.current) void refresh();
    previousPending.current = pendingCount;
  }, [pendingCount, refresh]);

  function startNaming() {
    const now = new Date();
    setLabel(
      `Draft — ${now.toLocaleDateString(undefined, { day: "numeric", month: "short" })}, ${now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`,
    );
    setNaming(true);
  }

  async function handleSaveSubmit(event: FormEvent) {
    event.preventDefault();
    const name = label.trim();
    if (!name || !editor || busy) return;

    const content = editor.getJSON();
    // Fail fast: the server would reject it anyway, and a doomed item in the
    // queue is worse than an immediate, clear error.
    if (JSON.stringify(content).length > MAX_VERSION_CONTENT_BYTES) {
      toast.error("This document is too large to save as a version (1 MB limit).");
      return;
    }

    setBusy(true);
    try {
      const result = await enqueueAndWait({
        kind: "version.create",
        documentId,
        payload: { label: name, content, capturedAt: new Date().toISOString() },
      });
      setNaming(false);
      setLabel("");

      if (result.status === "synced") toast.success("Version saved");
      else if (result.status === "queued") {
        toast.info("Version saved on this device — it will sync automatically when you reconnect.");
      } else toast.error(`Version not saved: ${result.error}`);
    } catch {
      toast.error("Could not save the version. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /** Snapshots the current draft directly on the server (not via the queue). */
  async function snapshotOnServer(snapshotLabel: string, restoreOf: string): Promise<boolean> {
    if (!editor) return false;
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: snapshotLabel,
          content: editor.getJSON(),
          clientMutationId: createMutationId(),
          capturedAt: new Date().toISOString(),
          // Lets the activity feed record "restored <version>".
          restoreOf,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function handleRestore(version: VersionSummary) {
    if (!editor || busy) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error(
        "Restoring needs a connection, so your current draft can be safely backed up first.",
      );
      return;
    }

    const confirmed = await confirmToast(
      `Restore "${version.label}"? Your current draft is saved as a new version first, so nothing is lost.`,
      "Restore",
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      // Load the target before touching anything: if it can't be fetched,
      // there's no reason to create a backup snapshot at all.
      const content = await fetchVersionContent(documentId, version.id);

      // Keep the backup label inside the server's limit — an over-long label
      // would be rejected and silently cancel the restore.
      const prefix = "Before restoring “";
      const backupLabel = `${prefix}${truncate(version.label, MAX_LABEL - prefix.length - 1)}”`;
      const snapshotted = await snapshotOnServer(backupLabel, version.id);
      if (!snapshotted) {
        toast.error("Could not back up the current draft, so the restore was cancelled.");
        return;
      }

      editor.commands.setContent(content);
      await refresh();
      toast.success("Version restored");
    } catch (error) {
      toast.error(
        error instanceof VersionFetchError ? error.message : "Could not restore this version.",
      );
    } finally {
      setBusy(false);
    }
  }

  function openCompare(version: VersionSummary) {
    if (!editor) return;
    setCompare({ baseId: version.id, currentContent: editor.getJSON() });
  }

  const empty = versions.length === 0 && queued.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {canManage && (
        <div className="border-border border-b p-3">
          {naming ? (
            <form onSubmit={handleSaveSubmit} className="space-y-2">
              <Input
                autoFocus
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Name this version"
                aria-label="Version name"
                maxLength={MAX_LABEL}
                className="h-8 text-xs"
              />
              <div className="flex justify-end gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setNaming(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!label.trim()} loading={busy}>
                  Save
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={startNaming}
              disabled={busy || !editor}
              className="w-full"
            >
              <Save />
              Save a version
            </Button>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {queued.length > 0 && (
          <div className="mb-3">
            <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wide uppercase">
              Waiting to sync
            </p>
            <OutboxList items={queued} authPaused={authPaused} />
          </div>
        )}

        {empty ? (
          <EmptyState
            size="sm"
            icon={<History />}
            title="No versions yet"
            description={
              canManage
                ? "Save a version to capture a snapshot you can return to later — it works offline too."
                : "No snapshots have been saved for this document."
            }
          />
        ) : (
          <ol className="relative space-y-1">
            {/* Timeline spine. */}
            <span className="bg-border absolute top-2 bottom-2 left-[7px] w-px" aria-hidden />

            {versions.map((version, index) => (
              <li key={version.id} className="relative pl-6">
                <span
                  className={cn(
                    "absolute top-2.5 left-0 size-3.5 rounded-full border-2",
                    index === 0
                      ? "border-primary bg-primary"
                      : "border-border-strong bg-background",
                  )}
                  aria-hidden
                />

                <div className="hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors">
                  <p className="truncate text-xs font-medium" title={version.label}>
                    {version.label}
                  </p>

                  <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-[11px]">
                    <Avatar name={version.authorName} size="xs" />
                    <span className="truncate">{version.authorName}</span>
                    <span aria-hidden>·</span>
                    <time dateTime={version.createdAt} suppressHydrationWarning>
                      {new Date(version.createdAt).toLocaleString(undefined, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openCompare(version)}
                      disabled={!editor}
                      className="h-7 px-1.5 text-[11px]"
                    >
                      <GitCompare />
                      Compare
                    </Button>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleRestore(version)}
                        disabled={busy || !editor}
                        className="h-7 px-1.5 text-[11px]"
                      >
                        <RotateCcw />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <VersionCompareDialog
        documentId={documentId}
        versions={versions}
        request={compare}
        onClose={() => setCompare(null)}
        aiEnabled={aiEnabled}
        canRestore={canManage}
        onRestore={(version) => void handleRestore(version)}
      />
    </div>
  );
}
