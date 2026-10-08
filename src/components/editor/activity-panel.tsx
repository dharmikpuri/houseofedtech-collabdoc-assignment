"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  Check,
  FilePlus2,
  History,
  Link2,
  Link2Off,
  MessageSquare,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Tag,
  Upload,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/format/relative-time";
import type { ActivityView } from "@/lib/authz/activity";

const ROLE = (value: unknown) =>
  value === "EDITOR" ? "an editor" : value === "VIEWER" ? "a viewer" : "a member";

const str = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);

/** Turns an activity entry into a sentence and an icon. */
function describe(entry: ActivityView): { text: string; icon: typeof Activity } {
  const meta = entry.meta ?? {};
  switch (entry.type) {
    case "document.created":
      return { text: "created the document", icon: FilePlus2 };
    case "document.imported":
      return { text: "imported the document from a file", icon: Upload };
    case "document.renamed":
      return { text: `renamed it to “${str(meta.to, "Untitled")}”`, icon: PencilLine };
    case "document.tagged": {
      const added = Array.isArray(meta.added) ? (meta.added as string[]) : [];
      const removed = Array.isArray(meta.removed) ? (meta.removed as string[]) : [];
      const parts = [
        added.length ? `added ${added.map((tag) => `#${tag}`).join(", ")}` : "",
        removed.length ? `removed ${removed.map((tag) => `#${tag}`).join(", ")}` : "",
      ].filter(Boolean);
      return { text: parts.length ? `${parts.join(" and ")}` : "updated tags", icon: Tag };
    }
    case "version.created":
      return { text: `saved version “${str(meta.label)}”`, icon: History };
    case "version.restored":
      return { text: `restored “${str(meta.label)}”`, icon: RotateCcw };
    case "member.added":
      return {
        text: `shared it with ${str(meta.name, "someone")} as ${ROLE(meta.role)}`,
        icon: UserPlus,
      };
    case "member.role_changed":
      return { text: `made ${str(meta.name, "someone")} ${ROLE(meta.role)}`, icon: Users };
    case "member.removed":
      return { text: `removed ${str(meta.name, "someone")}`, icon: UserMinus };
    case "member.joined":
      return { text: `joined as ${ROLE(meta.role)} via an invite link`, icon: UserPlus };
    case "link.created":
      return {
        text: `created an invite link for ${ROLE(meta.role).replace(/^an? /, "")}s`,
        icon: Link2,
      };
    case "link.revoked":
      return { text: "revoked an invite link", icon: Link2Off };
    case "comment.created":
      return { text: `commented on “${str(meta.quote)}”`, icon: MessageSquare };
    case "comment.resolved":
      return { text: `resolved a comment on “${str(meta.quote)}”`, icon: Check };
    case "comment.reopened":
      return { text: `reopened a comment on “${str(meta.quote)}”`, icon: RotateCcw };
    default:
      return { text: "made a change", icon: Activity };
  }
}

/**
 * The document's activity feed: who did what, newest first. Entries are
 * written server-side in the same transaction as the change they describe, so
 * the feed is an accurate record rather than a best-effort log.
 */
export function ActivityPanel({ documentId }: { documentId: string }) {
  const [items, setItems] = useState<ActivityView[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (before?: string) => {
      const url = new URL(
        `/api/documents/${encodeURIComponent(documentId)}/activity`,
        window.location.origin,
      );
      if (before) url.searchParams.set("before", before);
      try {
        const res = await fetch(url);
        if (!res.ok) {
          setError("Could not load activity.");
          return;
        }
        const data = (await res.json()) as { items: ActivityView[]; hasMore: boolean };
        setItems((previous) => (before && previous ? [...previous, ...data.items] : data.items));
        setHasMore(data.hasMore);
        setError(null);
      } catch {
        setError("You're offline — activity loads when you reconnect.");
      }
    },
    [documentId],
  );

  useEffect(() => {
    // Scheduled so state only changes from a callback, never inside the effect.
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function loadMore() {
    const last = items?.[items.length - 1];
    if (!last) return;
    setLoadingMore(true);
    await load(last.createdAt);
    setLoadingMore(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border flex items-center justify-between border-b px-3 py-1.5">
        <p className="text-muted-foreground text-[11px]">Who changed what, newest first.</p>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => void load()}
          aria-label="Refresh activity"
        >
          <RefreshCw />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {items === null && !error ? (
          <div className="space-y-3" aria-busy>
            <span className="sr-only" role="status">
              Loading activity…
            </span>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : items === null && error ? (
          <p className="text-danger flex items-start gap-1 text-xs" role="alert">
            <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : items && items.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Activity />}
            title="No activity yet"
            description="Renames, versions, sharing and comments will show up here."
          />
        ) : (
          <>
            <ol className="space-y-3">
              {items?.map((entry) => {
                const { text, icon: Icon } = describe(entry);
                return (
                  <li key={entry.id} className="flex gap-2 text-xs">
                    <Avatar name={entry.actorName} id={entry.actorId} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug break-words">
                        <span className="font-medium">{entry.actorName}</span>{" "}
                        <span className="text-muted-foreground">{text}</span>
                      </p>
                      <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[10px]">
                        <Icon className="size-3" aria-hidden />
                        <time
                          dateTime={entry.createdAt}
                          title={new Date(entry.createdAt).toLocaleString()}
                          suppressHydrationWarning
                        >
                          {formatRelative(entry.createdAt)}
                        </time>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            {error && (
              <p className="text-danger mt-3 text-[11px]" role="alert">
                {error}
              </p>
            )}
            {hasMore && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 w-full"
                onClick={() => void loadMore()}
                loading={loadingMore}
              >
                Load older activity
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
