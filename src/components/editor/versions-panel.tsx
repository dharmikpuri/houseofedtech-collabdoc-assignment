"use client";

import { useCallback, useState } from "react";
import type { Editor, JSONContent } from "@tiptap/react";

import { Button } from "@/components/ui/button";

export type VersionSummary = {
  id: string;
  label: string;
  authorName: string;
  createdAt: string;
};

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
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/versions`);
    if (res.ok) {
      const data = (await res.json()) as { versions: VersionSummary[] };
      setVersions(data.versions);
    }
  }, [documentId]);

  const saveVersion = useCallback(
    async (label: string) => {
      if (!editor) return;
      await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, content: editor.getJSON() }),
      });
    },
    [documentId, editor],
  );

  async function handleSave() {
    if (!editor) return;
    const label = window.prompt("Name this version", `Version ${new Date().toLocaleString()}`);
    if (!label?.trim()) return;
    setBusy(true);
    await saveVersion(label.trim());
    await refresh();
    setBusy(false);
  }

  async function handleRestore(version: VersionSummary) {
    if (!editor) return;
    const confirmed = window.confirm(
      `Restore "${version.label}"? The current content is saved as a new version first, so this can be undone.`,
    );
    if (!confirmed) return;

    setBusy(true);
    // Snapshot current state so the restore is reversible.
    await saveVersion(`Before restoring "${version.label}"`);

    const res = await fetch(`/api/documents/${documentId}/versions/${version.id}`);
    if (res.ok) {
      const data = (await res.json()) as { content: JSONContent };
      // setContent produces a forward edit, so it merges with live collaborators.
      editor.commands.setContent(data.content);
    }
    await refresh();
    setBusy(false);
  }

  async function handleSummarize(version: VersionSummary) {
    if (!editor) return;
    setSummarizingId(version.id);
    setSummaries((prev) => ({ ...prev, [version.id]: "" }));
    const res = await fetch(`/api/documents/${documentId}/versions/${version.id}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentContent: editor.getJSON() }),
    });
    const data = (await res.json().catch(() => ({}))) as { summary?: string; error?: string };
    setSummaries((prev) => ({
      ...prev,
      [version.id]: data.summary ?? data.error ?? "Could not generate a summary.",
    }));
    setSummarizingId(null);
  }

  return (
    <aside className="border-border shrink-0 rounded-lg border p-4 lg:w-72">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Version history</h2>
        {canManage && (
          <Button
            variant="ghost"
            onClick={handleSave}
            disabled={busy || !editor}
            className="h-8 px-2 text-sm"
          >
            Save version
          </Button>
        )}
      </div>

      {versions.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">No versions saved yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {versions.map((version) => (
            <li key={version.id} className="border-border rounded-md border p-2">
              <p className="truncate text-sm font-medium">{version.label}</p>
              <p className="text-muted-foreground text-xs">
                {version.authorName} · {new Date(version.createdAt).toLocaleString()}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {canManage && (
                  <Button
                    variant="ghost"
                    onClick={() => handleRestore(version)}
                    disabled={busy}
                    className="h-7 px-2 text-xs"
                  >
                    Restore
                  </Button>
                )}
                {aiEnabled && (
                  <Button
                    variant="ghost"
                    onClick={() => handleSummarize(version)}
                    disabled={summarizingId === version.id || !editor}
                    className="h-7 px-2 text-xs"
                  >
                    {summarizingId === version.id ? "Analysing…" : "What changed since?"}
                  </Button>
                )}
              </div>
              {summaries[version.id] && (
                <p className="text-muted-foreground mt-1 text-xs whitespace-pre-line">
                  {summaries[version.id]}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
