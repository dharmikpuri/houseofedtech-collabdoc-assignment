"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useTheme } from "next-themes";
import {
  Activity,
  Clock,
  CornerDownLeft,
  Download,
  FileCode2,
  FileText,
  FileType2,
  FlaskConical,
  History,
  Inbox,
  ListTree,
  MessageSquare,
  Monitor,
  Moon,
  Plus,
  Printer,
  Search,
  Sparkles,
  Star,
  Sun,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";

import { cn } from "@/lib/utils";
import { dispatchCommand } from "@/lib/commands/bus";
import {
  DOCUMENTS_PREFIX,
  ROUTES,
  dashboardViewPath,
  documentPath,
  searchPath,
} from "@/config/routes";

type PaletteDocument = {
  id: string;
  title: string;
  lastOpenedAt: string | null;
  favorite: boolean;
};

type Item = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string;
  run: () => void | Promise<void>;
};

/** Last successful list, so the palette still finds documents while offline. */
let cachedDocuments: PaletteDocument[] | null = null;

/**
 * Ctrl/⌘+K command palette: jump to any document, navigate, create, switch
 * theme, and — inside a document — open panels or export.
 *
 * Built on the Radix dialog primitive for focus trapping and Escape handling;
 * the list implements the combobox pattern (input keeps focus, the active
 * option is announced via aria-activedescendant).
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-[fade-in_0.15s_ease-out] bg-black/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className="bg-overlay border-border fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 animate-[scale-in_0.15s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden rounded-xl border shadow-lg"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          {/* Remounted per opening so the query and selection start fresh. */}
          {open && <PaletteBody close={() => onOpenChange(false)} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function PaletteBody({ close }: { close: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [documents, setDocuments] = useState<PaletteDocument[] | null>(cachedDocuments);
  const [offline, setOffline] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/documents")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { documents: PaletteDocument[] };
        cachedDocuments = data.documents;
        if (!cancelled) setDocuments(data.documents);
      })
      .catch(() => {
        if (!cancelled) setOffline(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const inDocument = pathname.startsWith(`${DOCUMENTS_PREFIX}/`);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => {
      close();
      router.push(href);
    };

    const needle = query.trim().toLowerCase();
    const docs = documents ?? [];
    const docMatches = needle
      ? docs
          .filter((doc) => doc.title.toLowerCase().includes(needle))
          .sort(
            (a, b) =>
              Number(b.title.toLowerCase().startsWith(needle)) -
                Number(a.title.toLowerCase().startsWith(needle)) || a.title.localeCompare(b.title),
          )
          .slice(0, 8)
      : [...docs]
          .filter((doc) => doc.lastOpenedAt)
          .sort((a, b) => Date.parse(b.lastOpenedAt!) - Date.parse(a.lastOpenedAt!))
          .slice(0, 5);

    const documentItems: Item[] = docMatches.map((doc) => ({
      id: `doc:${doc.id}`,
      group: needle ? "Documents" : "Recently opened",
      label: doc.title,
      icon: doc.favorite ? Star : FileText,
      run: go(documentPath(doc.id)),
    }));

    const actions: Item[] = [
      {
        id: "ask-ai",
        group: "Actions",
        label: needle ? `Ask AI: “${query.trim()}”` : "Ask AI about your documents",
        icon: Sparkles,
        keywords: "ask question ai search semantic",
        run: go(needle ? searchPath(query.trim()) : ROUTES.search),
      },
      {
        id: "new",
        group: "Actions",
        label: "New document",
        icon: Plus,
        keywords: "create add blank",
        run: async () => {
          if (!navigator.onLine) {
            toast.error("Creating a document needs a connection.");
            return;
          }
          close();
          try {
            const res = await fetch("/api/documents", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            });
            const data = (await res.json()) as { id?: string };
            if (!res.ok || !data.id) throw new Error();
            router.push(documentPath(data.id));
          } catch {
            toast.error("Couldn't create a document.");
          }
        },
      },
      ...(inDocument
        ? ([
            {
              id: "p-comments",
              group: "This document",
              label: "Open comments",
              icon: MessageSquare,
              run: () => {
                close();
                dispatchCommand({ type: "editor.open-panel", panel: "comments" });
              },
            },
            {
              id: "p-versions",
              group: "This document",
              label: "Open version history",
              icon: History,
              keywords: "restore compare snapshot",
              run: () => {
                close();
                dispatchCommand({ type: "editor.open-panel", panel: "versions" });
              },
            },
            {
              id: "p-outline",
              group: "This document",
              label: "Open outline",
              icon: ListTree,
              keywords: "headings toc contents",
              run: () => {
                close();
                dispatchCommand({ type: "editor.open-panel", panel: "outline" });
              },
            },
            {
              id: "p-activity",
              group: "This document",
              label: "Open activity",
              icon: Activity,
              keywords: "history log audit",
              run: () => {
                close();
                dispatchCommand({ type: "editor.open-panel", panel: "activity" });
              },
            },
            {
              id: "p-ai",
              group: "This document",
              label: "Open AI assistant",
              icon: Sparkles,
              keywords: "summary ask ai",
              run: () => {
                close();
                dispatchCommand({ type: "editor.open-panel", panel: "ai" });
              },
            },
            {
              id: "x-md",
              group: "This document",
              label: "Export as Markdown",
              icon: FileType2,
              keywords: "download md",
              run: () => {
                close();
                dispatchCommand({ type: "editor.export", format: "markdown" });
              },
            },
            {
              id: "x-html",
              group: "This document",
              label: "Export as HTML",
              icon: FileCode2,
              keywords: "download web",
              run: () => {
                close();
                dispatchCommand({ type: "editor.export", format: "html" });
              },
            },
            {
              id: "x-txt",
              group: "This document",
              label: "Export as plain text",
              icon: Download,
              keywords: "download txt",
              run: () => {
                close();
                dispatchCommand({ type: "editor.export", format: "text" });
              },
            },
            {
              id: "x-print",
              group: "This document",
              label: "Print or save as PDF",
              icon: Printer,
              keywords: "pdf print",
              run: () => {
                close();
                dispatchCommand({ type: "editor.export", format: "print" });
              },
            },
          ] satisfies Item[])
        : []),
      {
        id: "g-all",
        group: "Go to",
        label: "All documents",
        icon: Inbox,
        keywords: "dashboard home",
        run: go(ROUTES.dashboard),
      },
      {
        id: "g-fav",
        group: "Go to",
        label: "Favourites",
        icon: Star,
        keywords: "starred",
        run: go(dashboardViewPath("favorites")),
      },
      {
        id: "g-recent",
        group: "Go to",
        label: "Recent",
        icon: Clock,
        run: go(dashboardViewPath("recent")),
      },
      {
        id: "g-shared",
        group: "Go to",
        label: "Shared with me",
        icon: Users,
        run: go(dashboardViewPath("shared")),
      },
      {
        id: "g-lab",
        group: "Go to",
        label: "Sync lab",
        icon: FlaskConical,
        keywords: "demo crdt offline",
        run: go(ROUTES.lab),
      },
      {
        id: "t-light",
        group: "Theme",
        label: "Light theme",
        icon: Sun,
        run: () => {
          setTheme("light");
          close();
        },
      },
      {
        id: "t-dark",
        group: "Theme",
        label: "Dark theme",
        icon: Moon,
        run: () => {
          setTheme("dark");
          close();
        },
      },
      {
        id: "t-system",
        group: "Theme",
        label: "System theme",
        icon: Monitor,
        run: () => {
          setTheme("system");
          close();
        },
      },
    ];

    const matchingActions = needle
      ? actions.filter((action) =>
          `${action.label} ${action.keywords ?? ""}`.toLowerCase().includes(needle),
        )
      : actions;

    return [...documentItems, ...matchingActions];
  }, [documents, query, inDocument, router, close, setTheme]);

  const active = Math.min(index, Math.max(items.length - 1, 0));

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let lastGroup = "";

  return (
    <div>
      <div className="border-border flex items-center gap-2 border-b px-4">
        <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIndex((i) =>
                items.length ? (Math.min(i, items.length - 1) + 1) % items.length : 0,
              );
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setIndex((i) =>
                items.length
                  ? (Math.min(i, items.length - 1) - 1 + items.length) % items.length
                  : 0,
              );
            } else if (event.key === "Enter") {
              event.preventDefault();
              void items[active]?.run();
            }
          }}
          placeholder="Search documents or type a command…"
          aria-label="Search documents and commands"
          role="combobox"
          aria-expanded
          aria-controls="command-palette-list"
          aria-activedescendant={items[active] ? `cmd-${items[active]!.id}` : undefined}
          className="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
        />
      </div>

      <div
        ref={listRef}
        id="command-palette-list"
        role="listbox"
        aria-label="Results"
        className="max-h-[min(60vh,26rem)] overflow-y-auto p-1.5"
      >
        {offline && !documents && (
          <p className="text-muted-foreground px-3 py-2 text-xs">
            You&apos;re offline — document search is unavailable until you reconnect.
          </p>
        )}
        {documents === null && !offline && (
          <p className="text-muted-foreground px-3 py-2 text-xs" role="status">
            Loading documents…
          </p>
        )}
        {items.length === 0 ? (
          <p className="text-muted-foreground px-3 py-8 text-center text-sm">
            No results for “{query}”.
          </p>
        ) : (
          items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <div key={item.id}>
                {header && (
                  <p className="text-muted-foreground px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide uppercase">
                    {header}
                  </p>
                )}
                <div
                  id={`cmd-${item.id}`}
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  onMouseMove={() => setIndex(i)}
                  onClick={() => void item.run()}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                    i === active ? "bg-muted" : "",
                  )}
                >
                  <Icon className="text-muted-foreground size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {i === active && (
                    <CornerDownLeft className="text-muted-foreground size-3.5" aria-hidden />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-border text-muted-foreground flex items-center gap-3 border-t px-4 py-2 text-[11px]">
        <span>
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate
        </span>
        <span>
          <Kbd>Enter</Kbd> select
        </span>
        <span>
          <Kbd>Esc</Kbd> close
        </span>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="border-border bg-muted rounded border px-1 py-0.5 font-sans text-[10px]">
      {children}
    </kbd>
  );
}
