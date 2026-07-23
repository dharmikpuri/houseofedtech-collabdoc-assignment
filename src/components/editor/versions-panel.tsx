"use client";

import { useCallback, useState, type FormEvent } from "react";
import type { Editor, JSONContent } from "@tiptap/react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmToast } from "@/components/ui/confirm-toast";

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
  const [naming, setNaming] = useState(false);
  const [label, setLabel] = useState("");
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
    async (name: string) => {
      if (!editor) return false;
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: name, content: editor.getJSON() }),
      });
      return res.ok;
    },
    [documentId, editor],
  );

  function startNaming() {
    setLabel(`Version ${new Date().toLocaleString()}`);
    setNaming(true);
  }

  async function handleSaveSubmit(event: FormEvent) {
    event.preventDefault();
    const name = label.trim();
    if (!name || !editor) return;
    setBusy(true);
    const ok = await saveVersion(name);
    if (ok) {
      await refresh();
      setNaming(false);
      setLabel("");
      toast.success("Version saved");
    } else {
      toast.error("Could not save the version");
    }
    setBusy(false);
  }

  async function handleRestore(version: VersionSummary) {
    if (!editor) return;
    const confirmed = await confirmToast(
      `Restore "${version.label}"? Your current content is saved as a new version first, so you can undo this.`,
      "Restore",
    );
    if (!confirmed) return;

    setBusy(true);
    await saveVersion(`Before restoring "${version.label}"`);
    const res = await fetch(`/api/documents/${documentId}/versions/${version.id}`);
    if (res.ok) {
      const data = (await res.json()) as { content: JSONContent };
      editor.commands.setContent(data.content);
      await refresh();
      toast.success("Version restored");
    } else {
      toast.error("Could not restore this version");
    }
    setBusy(false);
  }

  async function handleSummarize(version: VersionSummary) {
    if (!editor) return;
    setSummarizingId(version.id);
    const res = await fetch(`/api/documents/${documentId}/versions/${version.id}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentContent: editor.getJSON() }),
    });
    const data = (await res.json().catch(() => ({}))) as { summary?: string; error?: string };
    if (res.ok && data.summary) {
      setSummaries((prev) => ({ ...prev, [version.id]: data.summary! }));
    } else {
      toast.error(data.error ?? "Could not generate a summary.");
    }
    setSummarizingId(null);
  }

  return (
    <aside className="border-border shrink-0 rounded-lg border p-4 lg:w-72">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Version history</h2>
        {canManage && !naming && (
          <Button
            variant="ghost"
            onClick={startNaming}
            disabled={busy || !editor}
            className="h-8 px-2 text-sm"
          >
            Save version
          </Button>
        )}
      </div>

      {naming && (
        <form onSubmit={handleSaveSubmit} className="mt-3 flex flex-col gap-2">
          <Input
            autoFocus
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Name this version"
            className="h-9 text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setNaming(false)}
              className="h-8 px-3 text-sm"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !label.trim()} className="h-8 px-3 text-sm">
              Save
            </Button>
          </div>
        </form>
      )}

      {versions.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">No versions saved yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {versions.map((version) => (
            <li key={version.id} className="border-border rounded-md border p-2">
              <p className="truncate text-sm font-medium">{version.label}</p>
              <p className="text-muted-foreground text-xs" suppressHydrationWarning>
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
