"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Collaborator } from "@/lib/authz/sharing";
import type { Role } from "@/lib/authz/roles";

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

export function ShareDialog({
  documentId,
  initialCollaborators,
}: {
  documentId: string;
  initialCollaborators: Collaborator[];
}) {
  const [open, setOpen] = useState(false);
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleShare(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    let res: Response;
    try {
      res = await fetch(`/api/documents/${documentId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
    } catch {
      setError("Network error — make sure you are online.");
      setBusy(false);
      return;
    }

    // API always returns JSON; if it doesn't (e.g. a stale 404 HTML page) fall back gracefully.
    const data = (await res.json().catch(() => ({}))) as {
      collaborator?: Collaborator;
      error?: string;
    };

    if (!res.ok || !data.collaborator) {
      // Give the most helpful message possible:
      // • API returns explicit error string → use it directly
      // • 404 without JSON → document not found (stale page, re-open the doc)
      // • anything else → generic fallback
      const fallback =
        res.status === 404
          ? "Document not found — try refreshing the page."
          : "Could not share the document. Please try again.";
      setError(data.error ?? fallback);
      setBusy(false);
      return;
    }

    const added = data.collaborator;
    setCollaborators((prev) => [...prev.filter((c) => c.userId !== added.userId), added]);
    setEmail("");
    setBusy(false);
    toast.success(`Shared with ${added.name} as ${ROLE_LABELS[added.role]}`);
  }

  async function handleRemove(userId: string) {
    setBusy(true);
    const res = await fetch(`/api/documents/${documentId}/permissions/${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setCollaborators((prev) => prev.filter((c) => c.userId !== userId));
      toast.success("Access removed");
    } else {
      toast.error("Could not remove access");
    }
    setBusy(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-9 px-3 text-sm"
      >
        Share
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-background border-border w-full max-w-md rounded-lg border p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Share document</h2>
              <Button variant="ghost" onClick={() => setOpen(false)} className="h-8 px-2 text-sm">
                Close
              </Button>
            </div>

            <form onSubmit={handleShare} className="mt-4 flex gap-2">
              <Input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@example.com"
                className="flex-1"
              />
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as "EDITOR" | "VIEWER")}
                className="border-border bg-background rounded-md border px-2 text-sm"
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <Button type="submit" disabled={busy}>
                Add
              </Button>
            </form>
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

            <ul className="mt-4 space-y-2">
              {collaborators.map((collaborator) => (
                <li key={collaborator.userId} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{collaborator.name}</p>
                    <p className="text-muted-foreground truncate text-xs">{collaborator.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {ROLE_LABELS[collaborator.role]}
                    </span>
                    {collaborator.role !== "OWNER" && (
                      <Button
                        variant="ghost"
                        onClick={() => handleRemove(collaborator.userId)}
                        disabled={busy}
                        className="h-7 px-2 text-xs text-red-600 dark:text-red-400"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
