"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Copy, Link2, Loader2, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleBadge } from "@/components/documents/role-badge";
import { confirmToast } from "@/components/ui/confirm-toast";
import type { ShareLinkView } from "@/lib/authz/share-links";

const EXPIRY_OPTIONS = [
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "never", label: "Never" },
] as const;

type Expiry = (typeof EXPIRY_OPTIONS)[number]["value"];

/**
 * Invite links for the share dialog (owners only).
 *
 * The full link is displayed once, right after creation — the server keeps
 * only a hash, so it genuinely can't be shown again. Existing links are listed
 * by role and expiry, each revocable.
 */
export function InviteLinks({ documentId, online }: { documentId: string; online: boolean }) {
  const [links, setLinks] = useState<ShareLinkView[] | null>(null);
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("VIEWER");
  const [expiresIn, setExpiresIn] = useState<Expiry>("7d");
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/documents/${encodeURIComponent(documentId)}/share-links`;

  useEffect(() => {
    let cancelled = false;
    fetch(base)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { links: ShareLinkView[] };
        if (!cancelled) setLinks(data.links);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load invite links.");
      });
    return () => {
      cancelled = true;
    };
  }, [base]);

  async function create() {
    setCreating(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, expiresIn }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        link?: ShareLinkView;
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.link || !data.url) {
        setError(data.error ?? "Could not create a link.");
        return;
      }
      setLinks((previous) => [data.link!, ...(previous ?? [])]);
      setFreshUrl(data.url);
    } catch {
      setError("Network error — make sure you are online.");
    } finally {
      setCreating(false);
    }
  }

  async function copy() {
    if (!freshUrl) return;
    try {
      await navigator.clipboard.writeText(freshUrl);
      setCopied(true);
      toast.success("Invite link copied");
    } catch {
      // Clipboard can be blocked (permissions, insecure context); the field
      // is selectable as a fallback.
      toast.info("Select the link and copy it manually.");
    }
  }

  async function revoke(link: ShareLinkView) {
    const confirmed = await confirmToast(
      "Revoke this link? Anyone who hasn't joined yet won't be able to use it.",
      "Revoke",
    );
    if (!confirmed) return;
    setRevokingId(link.id);
    try {
      const res = await fetch(`${base}/${encodeURIComponent(link.id)}`, { method: "DELETE" });
      if (res.ok) {
        setLinks((previous) => (previous ?? []).filter((item) => item.id !== link.id));
        toast.success("Link revoked");
      } else {
        toast.error("Could not revoke the link.");
      }
    } catch {
      toast.error("Network error — make sure you are online.");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="border-border mt-5 border-t pt-5">
      <h3 className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
        <Link2 className="size-3.5" aria-hidden />
        Invite with a link
      </h3>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex-1 text-xs">
          <span className="sr-only">Access granted by the link</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as "EDITOR" | "VIEWER")}
            className="border-border bg-input h-9 w-full rounded-md border px-2 text-sm"
          >
            <option value="VIEWER">Anyone with the link can view</option>
            <option value="EDITOR">Anyone with the link can edit</option>
          </select>
        </label>
        <label className="text-xs sm:w-32">
          <span className="sr-only">Link expires after</span>
          <select
            value={expiresIn}
            onChange={(event) => setExpiresIn(event.target.value as Expiry)}
            className="border-border bg-input h-9 w-full rounded-md border px-2 text-sm"
          >
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value === "never" ? "Never expires" : `Expires in ${option.label}`}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="secondary"
          onClick={() => void create()}
          loading={creating}
          disabled={!online}
        >
          Create link
        </Button>
      </div>

      {freshUrl && (
        <div className="border-primary/30 bg-primary-subtle/40 mt-3 rounded-md border p-2.5">
          <p className="text-muted-foreground mb-1.5 text-[11px]">
            Copy it now — for security, the full link can&apos;t be shown again.
          </p>
          <div className="flex gap-1.5">
            <Input
              readOnly
              value={freshUrl}
              aria-label="New invite link"
              onFocus={(event) => event.currentTarget.select()}
              className="h-8 font-mono text-[11px]"
            />
            <Button size="sm" onClick={() => void copy()} aria-label="Copy invite link">
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-danger mt-2 flex items-center gap-1.5 text-xs">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {links === null && !error ? (
        <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Loading links…
        </p>
      ) : links && links.length > 0 ? (
        <ul className="divide-border mt-3 divide-y">
          {links.map((link) => (
            <li key={link.id} className="flex items-center gap-2 py-2 text-xs">
              <RoleBadge role={link.role} size="sm" />
              <span className="text-muted-foreground min-w-0 flex-1 truncate">
                {link.expiresAt
                  ? `Expires ${new Date(link.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
                  : "Never expires"}
                {" · "}
                {link.useCount} joined
              </span>
              <Button
                variant="danger-ghost"
                size="icon-sm"
                onClick={() => void revoke(link)}
                loading={revokingId === link.id}
                disabled={!online}
                aria-label="Revoke link"
              >
                {revokingId !== link.id && <Trash2 />}
              </Button>
            </li>
          ))}
        </ul>
      ) : links ? (
        <p className="text-muted-foreground mt-3 text-xs">No active invite links.</p>
      ) : null}
    </div>
  );
}
