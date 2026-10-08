"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Bell, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatRelative } from "@/lib/format/relative-time";
import type { NotificationView } from "@/lib/authz/notifications";

const POLL_MS = 60_000;

/**
 * Mentions and shares addressed to the signed-in user.
 *
 * Opening the menu marks everything read on the server, but items that were
 * unread keep their highlight until the menu closes, so the user can still see
 * what was new.
 */
export function NotificationsMenu() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationView[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as { items: NotificationView[]; unread: number };
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      // Offline: keep showing the last known state.
    }
  }, []);

  useEffect(() => {
    // The first fetch is scheduled like the later polls, so state only ever
    // changes from a callback — never synchronously inside the effect.
    const first = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), POLL_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      void fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      }).catch(() => undefined);
    }
    if (!next) {
      // Now that the user has seen them, drop the "new" highlight.
      setItems((current) => current.map((item) => ({ ...item, read: true })));
    }
  }

  function openItem(item: NotificationView) {
    setOpen(false);
    router.push(
      `/documents/${item.documentId}${item.threadId ? `?thread=${encodeURIComponent(item.threadId)}` : ""}`,
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread ? `Notifications (${unread} unread)` : "Notifications"}
        >
          <Bell />
          {unread > 0 && (
            <span
              className="bg-danger absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[9px] leading-4 font-semibold text-white tabular-nums"
              aria-hidden
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-border border-b px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
        </div>
        {items.length === 0 ? (
          <p className="text-muted-foreground px-3 py-8 text-center text-xs">
            You&apos;re all caught up. Mentions and shares will appear here.
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className={cn(
                    "hover:bg-muted flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors",
                    !item.read && "bg-primary-subtle/50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-3.5",
                      item.type === "mention"
                        ? "bg-info-subtle text-info"
                        : "bg-success-subtle text-success",
                    )}
                    aria-hidden
                  >
                    {item.type === "mention" ? <AtSign /> : <Share2 />}
                  </span>
                  <span className="min-w-0 flex-1 text-xs">
                    <span className="block leading-snug">
                      <span className="font-medium">{item.actorName}</span>{" "}
                      {item.type === "mention" ? "mentioned you in " : "shared "}
                      <span className="font-medium">“{item.documentTitle}”</span>
                      {item.type === "share" ? ` with you — you ${item.preview}` : ""}
                    </span>
                    {item.type === "mention" && (
                      <span className="text-muted-foreground mt-0.5 line-clamp-2 block">
                        {item.preview}
                      </span>
                    )}
                    <span
                      className="text-muted-foreground mt-1 block text-[10px]"
                      suppressHydrationWarning
                    >
                      {formatRelative(item.createdAt)}
                    </span>
                  </span>
                  {!item.read && (
                    <span
                      className="bg-primary mt-1.5 size-2 shrink-0 rounded-full"
                      aria-label="Unread"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
