"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CloudUpload,
  FileText,
  FlaskConical,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  Search,
  Settings,
  WifiOff,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { SyncPill } from "@/components/sync/sync-indicator";
import { OutboxProvider } from "@/components/sync/outbox-provider";
import { OutboxList } from "@/components/sync/outbox-list";
import { CommandPalette } from "@/components/command/command-palette";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { useNetworkStatus } from "@/lib/sync/use-network-status";
import { useOutbox } from "@/lib/outbox/use-outbox";
import { Logo } from "@/components/brand/logo";
import { CreateDocumentButton } from "@/components/documents/create-document-button";

const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Documents", icon: FileText },
      { href: "/search", label: "Search & Ask", icon: MessageSquareText },
    ],
  },
  {
    label: "More",
    items: [
      { href: "/lab", label: "Sync lab", icon: FlaskConical },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

/**
 * Authenticated application shell: persistent sidebar on desktop, off-canvas
 * drawer on mobile, and a topbar that carries connectivity and account controls.
 *
 * Connectivity lives in the shell rather than the editor because it is a
 * property of the whole session — the user should be able to tell they are
 * offline from the dashboard, not only while typing.
 */
export function AppShell({
  user,
  signOutAction,
  children,
}: {
  user: { id: string; name: string; email: string };
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { online } = useNetworkStatus();
  const [collapsed, setCollapsed] = useState(false);

  // The drawer stores the route it was opened on rather than a boolean. A route
  // change therefore closes it during render — no effect, no extra render pass,
  // and no risk of the drawer lingering over the newly navigated page.
  const [openedOnPath, setOpenedOnPath] = useState<string | null>(null);
  const mobileOpen = openedOnPath === pathname;
  const setMobileOpen = useCallback(
    (open: boolean) => setOpenedOnPath(open ? pathname : null),
    [pathname],
  );

  const [paletteOpen, setPaletteOpen] = useState(false);

  // Ctrl/⌘+K opens the command palette from anywhere, including the editor.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Escape closes the drawer, matching the dialog convention elsewhere.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, setMobileOpen]);

  return (
    <TooltipProvider delayDuration={300}>
      <OutboxProvider userId={user.id} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <div className="flex min-h-dvh">
        {/* Backdrop for the mobile drawer. */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 animate-[fade-in_0.2s_ease-out] bg-black/45 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}

        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          pathname={pathname}
          online={online}
          onCloseMobile={() => setMobileOpen(false)}
          onToggleCollapse={() => setCollapsed((value) => !value)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-border bg-background/90 sticky top-0 z-30 border-b backdrop-blur-md print:hidden">
            <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
              >
                <Menu />
              </Button>

              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="border-border bg-subtle text-muted-foreground hover:border-border-strong hover:text-foreground flex h-9 w-full max-w-sm min-w-0 items-center gap-2 rounded-lg border px-3 text-sm transition-colors"
                aria-label="Search and commands"
                aria-keyshortcuts="Control+K Meta+K"
              >
                <Search className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-left">
                  <span className="sm:hidden">Search…</span>
                  <span className="hidden sm:inline">Search documents or run a command…</span>
                </span>
                <kbd className="border-border bg-surface text-muted-foreground hidden h-5 items-center rounded border px-1.5 font-mono text-[10px] sm:inline-flex">
                  Ctrl K
                </kbd>
              </button>

              <div className="min-w-0 flex-1" />

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
                {!online && <SyncPill state="offline" className="hidden sm:inline-flex" />}
                {!online && (
                  <span
                    className="text-warning sm:hidden [&_svg]:size-4"
                    role="status"
                    aria-label="Offline"
                  >
                    <WifiOff />
                  </span>
                )}
                <QueueIndicator />
                <NotificationsMenu />
                <ThemeToggle />
                <UserMenu
                  name={user.name}
                  email={user.email}
                  userId={user.id}
                  signOutAction={signOutAction}
                />
              </div>
            </div>
          </header>

          <main id="main-content" className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * Header badge for the offline mutation queue. Hidden when the queue is empty;
 * otherwise shows how many actions are waiting, in red if any need attention,
 * and opens the full list with retry/discard controls.
 */
function QueueIndicator() {
  const { items, authPaused } = useOutbox();
  if (items.length === 0) return null;

  const failed = items.filter((m) => m.status === "failed").length;
  const needsAttention = failed > 0 || authPaused;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
          needsAttention
            ? "border-danger/30 bg-danger-subtle text-danger"
            : "border-border bg-surface text-muted-foreground hover:text-foreground",
        )}
        aria-label={`${items.length} change${items.length === 1 ? "" : "s"} waiting to sync${
          failed ? `, ${failed} failed` : ""
        }. Show sync queue`}
      >
        <CloudUpload className="size-3.5" aria-hidden />
        <span className="tabular-nums">{items.length}</span>
        <span className="hidden sm:inline">{needsAttention ? "need attention" : "queued"}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-semibold">Sync queue</p>
        <p className="text-muted-foreground mt-0.5 mb-3 text-xs">
          Actions you took while offline. They&apos;re stored on this device and sent in order as
          soon as the connection allows.
        </p>
        <OutboxList items={items} authPaused={authPaused} />
      </PopoverContent>
    </Popover>
  );
}

function Sidebar({
  collapsed,
  mobileOpen,
  pathname,
  online,
  onCloseMobile,
  onToggleCollapse,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  pathname: string;
  online: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
}) {
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      className={cn(
        "bg-subtle border-border z-50 flex flex-col border-r print:hidden",
        // Mobile: fixed off-canvas drawer. Desktop: sticky full-height rail.
        "fixed inset-y-0 left-0 w-64 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "transition-transform duration-200 lg:transition-[width]",
        collapsed ? "lg:w-15" : "lg:w-60",
      )}
      aria-label="Main navigation"
    >
      <div
        className={cn(
          "flex h-14 items-center gap-2 px-3",
          collapsed && "lg:justify-center lg:px-0",
        )}
      >
        <Logo href="/dashboard" showWordmark={!collapsed} className="rounded-md px-1 py-1" />

        <div className={cn("flex-1", collapsed && "lg:hidden")} />

        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onCloseMobile}
          aria-label="Close navigation"
        >
          <X />
        </Button>
      </div>

      <div className={cn("px-3 pt-1 pb-5", collapsed && "lg:px-2.5")}>
        <CreateDocumentButton
          compact={collapsed}
          size={collapsed ? "icon" : "md"}
          formClassName="w-full"
          className="w-full"
          aria-label={collapsed ? "New document" : undefined}
          title={collapsed ? "New document" : undefined}
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            {!collapsed && (
              <p className="text-muted-foreground/80 mb-1.5 px-2.5 text-[10.5px] font-semibold tracking-[0.08em] uppercase">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors",
                        "[&_svg]:size-4 [&_svg]:shrink-0",
                        collapsed && "lg:justify-center lg:px-0",
                        active
                          ? "bg-primary-subtle text-primary font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium",
                      )}
                    >
                      <Icon />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-2 p-2.5">
        {!collapsed && <ConnectionCard online={online} />}

        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={onToggleCollapse}
          className={cn(
            "text-muted-foreground hidden w-full lg:inline-flex",
            !collapsed && "justify-start",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeftClose className={cn("transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}

/**
 * Sidebar footer line that states what happens to edits right now. The header
 * shows an offline pill too; this is the calm, always-visible version.
 */
function ConnectionCard({ online }: { online: boolean }) {
  return (
    <p
      className="text-muted-foreground flex items-center gap-2 px-2.5 py-1 text-xs"
      title={
        online
          ? "Edits save to this device first, then sync."
          : "Keep writing — edits are saved here and sync later."
      }
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", online ? "bg-success" : "bg-warning")}
        aria-hidden
      />
      {online ? "Online — changes sync live" : "Offline — changes saved locally"}
    </p>
  );
}
