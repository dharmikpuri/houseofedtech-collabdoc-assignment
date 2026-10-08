"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Share2, UserPlus, WifiOff, X } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/lib/sync/use-network-status";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/documents/role-badge";
import { InviteLinks } from "@/components/documents/invite-links";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Collaborator } from "@/lib/authz/sharing";
import type { Role } from "@/lib/authz/roles";

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

const SHAREABLE: { value: "EDITOR" | "VIEWER"; label: string; hint: string }[] = [
  { value: "EDITOR", label: "Editor", hint: "Can edit and save versions" },
  { value: "VIEWER", label: "Viewer", hint: "Can read only" },
];

/**
 * Owner-only sharing. Adding, changing and removing access all go through the
 * REST API, which re-checks the caller's role server-side — this dialog only
 * renders for owners, but that is a convenience, not the security boundary.
 */
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
  // Permission changes are never queued offline (see lib/outbox/types.ts), so
  // the form is disabled rather than letting the request fail.
  const { online } = useNetworkStatus();
  const [removingId, setRemovingId] = useState<string | null>(null);

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

  async function handleRemove(userId: string, name: string) {
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/documents/${documentId}/permissions/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCollaborators((prev) => prev.filter((c) => c.userId !== userId));
        toast.success(`Removed ${name}`);
      } else {
        toast.error("Could not remove access");
      }
    } catch {
      toast.error("Network error — make sure you are online.");
    }
    setRemovingId(null);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="md">
          <Share2 />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this document</DialogTitle>
          <DialogDescription>
            People you invite can open it on their own devices and keep editing offline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleShare} className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              placeholder="teammate@company.com"
              aria-label="Email address to share with"
              aria-invalid={Boolean(error)}
              required
              className="flex-1"
            />
            <div
              className="border-border bg-surface flex shrink-0 items-center gap-0.5 rounded-md border p-0.5"
              role="radiogroup"
              aria-label="Access level"
            >
              {SHAREABLE.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={role === option.value}
                  title={option.hint}
                  onClick={() => setRole(option.value)}
                  className={
                    role === option.value
                      ? "bg-primary-subtle text-primary rounded-[5px] px-2.5 py-1.5 text-xs font-medium"
                      : "text-muted-foreground hover:text-foreground rounded-[5px] px-2.5 py-1.5 text-xs font-medium"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="text-danger flex items-center gap-1.5 text-xs">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          {!online && (
            <p className="text-warning flex items-center gap-1.5 text-xs" role="status">
              <WifiOff className="size-3.5 shrink-0" aria-hidden />
              You&apos;re offline. Sharing and access changes need a connection.
            </p>
          )}

          <Button
            type="submit"
            loading={busy}
            disabled={!email.trim() || !online}
            className="w-full"
          >
            {!busy && <UserPlus />}
            Invite
          </Button>
        </form>

        <div className="mt-5">
          <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            People with access ({collaborators.length})
          </h3>
          <ul className="divide-border divide-y">
            {collaborators.map((person) => (
              <li key={person.userId} className="flex items-center gap-2.5 py-2.5">
                <Avatar name={person.name} id={person.userId} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{person.name}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {person.email}
                  </span>
                </span>
                <RoleBadge role={person.role} size="sm" />
                {person.role !== "OWNER" && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRemove(person.userId, person.name)}
                    loading={removingId === person.userId}
                    disabled={!online}
                    aria-label={`Remove ${person.name}`}
                  >
                    {removingId !== person.userId && <X />}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <InviteLinks documentId={documentId} online={online} />
      </DialogContent>
    </Dialog>
  );
}
