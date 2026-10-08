"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  History,
  Inbox,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  Pencil,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { confirmToast } from "@/components/ui/confirm-toast";
import { RoleBadge } from "@/components/documents/role-badge";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";
import { formatRelative } from "@/lib/format/relative-time";
import { tagTint } from "@/lib/tags";
import type { Role } from "@/lib/authz/roles";
import type { FolderSummary } from "@/lib/authz/folders";

export type DocumentListItem = {
  id: string;
  title: string;
  /** ISO strings — serialised at the server-component boundary. */
  updatedAt: string;
  lastOpenedAt: string | null;
  role: Role;
  favorite: boolean;
  folderId: string | null;
  tags: string[];
};

type SortKey = "recent" | "title" | "role";
type ViewMode = "list" | "grid";
type RoleFilter = "ALL" | Role;
type WorkspaceView = "all" | "favorites" | "recent" | "shared";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Last updated",
  title: "Title (A–Z)",
  role: "Your role",
};

const ROLE_ORDER: Record<Role, number> = { OWNER: 0, EDITOR: 1, VIEWER: 2 };

const FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "ALL", label: "Any role" },
  { value: "OWNER", label: "Owned by me" },
  { value: "EDITOR", label: "Can edit" },
  { value: "VIEWER", label: "View only" },
];

const RECENT_LIMIT = 20;
/** Sentinel for "no tag filter" (radio items need a non-empty value). */
const ANY_TAG = "__any__";
const DRAG_TYPE = "application/x-collabdoc-document";

/**
 * The workspace: views (all, favourites, recent, shared), personal folders,
 * search, sort and filters over the user's documents.
 *
 * The active view lives in the URL (`?view=favorites`, `?folder=<id>`), so it
 * survives reloads, works with back/forward, and can be linked to. Filtering
 * runs on the client over the already-loaded list: instant, and still works
 * offline.
 *
 * Favourites and folders are personal (they never change what collaborators
 * see) and update optimistically, rolling back if the server refuses.
 */
export function DocumentList({
  documents,
  folders: initialFolders,
  createAction,
}: {
  documents: DocumentListItem[];
  folders: FolderSummary[];
  createAction: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local copies for optimistic updates; re-seeded when the server sends new data.
  const [items, setItems] = useState(documents);
  const [folders, setFolders] = useState(initialFolders);
  const [seen, setSeen] = useState({ documents, folders: initialFolders });
  if (seen.documents !== documents || seen.folders !== initialFolders) {
    setSeen({ documents, folders: initialFolders });
    setItems(documents);
    setFolders(initialFolders);
  }

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [mode, setMode] = useState<ViewMode>("list");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [tagFilter, setTagFilter] = useState<string>("");

  const allTags = useMemo(() => [...new Set(items.flatMap((doc) => doc.tags))].sort(), [items]);

  const folderParam = searchParams.get("folder");
  const activeFolder = folders.find((folder) => folder.id === folderParam) ?? null;
  const viewParam = searchParams.get("view");
  const view: WorkspaceView =
    viewParam === "favorites" || viewParam === "recent" || viewParam === "shared"
      ? viewParam
      : "all";

  function navigate(next: { view?: WorkspaceView; folder?: string | null }) {
    const params = new URLSearchParams();
    if (next.folder) params.set("folder", next.folder);
    else if (next.view && next.view !== "all") params.set("view", next.view);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const counts = useMemo(() => {
    const perFolder = new Map<string, number>();
    for (const doc of items) {
      if (doc.folderId) perFolder.set(doc.folderId, (perFolder.get(doc.folderId) ?? 0) + 1);
    }
    return {
      all: items.length,
      favorites: items.filter((doc) => doc.favorite).length,
      shared: items.filter((doc) => doc.role !== "OWNER").length,
      perFolder,
    };
  }, [items]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    let scoped = items;
    if (activeFolder) scoped = scoped.filter((doc) => doc.folderId === activeFolder.id);
    else if (view === "favorites") scoped = scoped.filter((doc) => doc.favorite);
    else if (view === "shared") scoped = scoped.filter((doc) => doc.role !== "OWNER");
    else if (view === "recent") {
      scoped = scoped
        .filter((doc) => doc.lastOpenedAt)
        .sort((a, b) => Date.parse(b.lastOpenedAt!) - Date.parse(a.lastOpenedAt!))
        .slice(0, RECENT_LIMIT);
    }

    const filtered = scoped.filter((doc) => {
      if (roleFilter !== "ALL" && doc.role !== roleFilter) return false;
      if (tagFilter && !doc.tags.includes(tagFilter)) return false;
      // "#tag" searches tags; anything else matches titles or tags.
      if (!needle) return true;
      if (needle.startsWith("#")) return doc.tags.some((tag) => tag.startsWith(needle.slice(1)));
      return (
        doc.title.toLowerCase().includes(needle) || doc.tags.some((tag) => tag.includes(needle))
      );
    });

    // "Recent" is ordered by when *you* opened it; other views honour the sort.
    if (view === "recent" && !activeFolder) return filtered;

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
        case "role":
          return (
            ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
            a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
          );
        case "recent":
        default:
          return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      }
    });
  }, [items, query, sort, roleFilter, tagFilter, view, activeFolder]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  async function patchMeta(
    doc: DocumentListItem,
    patch: { favorite?: boolean; folderId?: string | null },
    success?: string,
  ) {
    if (!navigator.onLine) {
      toast.error("Organising documents needs a connection. Try again when you're back online.");
      return;
    }
    const previous = items;
    setItems((current) =>
      current.map((item) => (item.id === doc.id ? { ...item, ...patch } : item)),
    );
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(doc.id)}/meta`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      if (success) toast.success(success);
    } catch {
      setItems(previous);
      toast.error("Couldn't update that document. Please try again.");
    }
  }

  const toggleFavorite = (doc: DocumentListItem) =>
    void patchMeta(doc, { favorite: !doc.favorite });

  const moveTo = (doc: DocumentListItem, folderId: string | null) => {
    if (doc.folderId === folderId) return;
    const name = folders.find((folder) => folder.id === folderId)?.name;
    void patchMeta(doc, { folderId }, folderId ? `Moved to “${name}”` : "Removed from folder");
  };

  async function createFolder(name: string): Promise<boolean> {
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        folder?: FolderSummary;
        error?: string;
      };
      if (!res.ok || !data.folder) {
        toast.error(data.error ?? "Couldn't create the folder.");
        return false;
      }
      setFolders((current) =>
        [...current, data.folder!].sort((a, b) => a.name.localeCompare(b.name)),
      );
      return true;
    } catch {
      toast.error("Creating folders needs a connection.");
      return false;
    }
  }

  async function renameFolder(folder: FolderSummary, name: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/folders/${encodeURIComponent(folder.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      setFolders((current) =>
        current
          .map((item) => (item.id === folder.id ? { ...item, name } : item))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      return true;
    } catch {
      toast.error("Couldn't rename the folder.");
      return false;
    }
  }

  async function deleteFolder(folder: FolderSummary) {
    const confirmed = await confirmToast(
      `Delete the folder “${folder.name}”? The documents inside are kept — they just leave the folder.`,
      "Delete folder",
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/folders/${encodeURIComponent(folder.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setFolders((current) => current.filter((item) => item.id !== folder.id));
      setItems((current) =>
        current.map((doc) => (doc.folderId === folder.id ? { ...doc, folderId: null } : doc)),
      );
      if (activeFolder?.id === folder.id) navigate({ view: "all" });
      toast.success("Folder deleted");
    } catch {
      toast.error("Couldn't delete the folder.");
    }
  }

  function dropOnFolder(folderId: string, documentId: string) {
    const doc = items.find((item) => item.id === documentId);
    if (doc) moveTo(doc, folderId);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (documents.length === 0) {
    return <FirstRun createAction={createAction} />;
  }

  const heading = activeFolder
    ? activeFolder.name
    : {
        all: "All documents",
        favorites: "Favourites",
        recent: "Recently opened",
        shared: "Shared with me",
      }[view];
  const filtersActive = query.trim().length > 0 || roleFilter !== "ALL" || tagFilter !== "";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <WorkspaceNav
        view={activeFolder ? null : view}
        activeFolderId={activeFolder?.id ?? null}
        counts={counts}
        folders={folders}
        onNavigate={navigate}
        onCreateFolder={createFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={(folder) => void deleteFolder(folder)}
        onDropDocument={dropOnFolder}
      />

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${heading.toLowerCase()}…`}
              aria-label="Search documents by title"
              icon={<Search />}
              className={cn(query && "pr-9")}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded p-1"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="md">
                  <SlidersHorizontal />
                  <span className="hidden sm:inline">Filter & sort</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Your role</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={roleFilter}
                  onValueChange={(value) => setRoleFilter(value as RoleFilter)}
                >
                  {FILTERS.map((filter) => (
                    <DropdownMenuRadioItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                {allTags.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Tag</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={tagFilter || ANY_TAG}
                      onValueChange={(value) => setTagFilter(value === ANY_TAG ? "" : value)}
                    >
                      <DropdownMenuRadioItem value={ANY_TAG}>Any tag</DropdownMenuRadioItem>
                      {allTags.map((tag) => (
                        <DropdownMenuRadioItem key={tag} value={tag}>
                          #{tag}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(value) => setSort(value as SortKey)}
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                    <DropdownMenuRadioItem key={key} value={key}>
                      {SORT_LABELS[key]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <div
              className="border-border bg-muted hidden items-center gap-0.5 rounded-lg border p-0.5 sm:flex"
              role="group"
              aria-label="Layout"
            >
              <ViewButton
                active={mode === "list"}
                onClick={() => setMode("list")}
                label="List view"
                icon={<ListIcon />}
              />
              <ViewButton
                active={mode === "grid"}
                onClick={() => setMode("grid")}
                label="Grid view"
                icon={<LayoutGrid />}
              />
            </div>
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <h2 className="truncate text-sm font-semibold">{heading}</h2>
          {/* A live region, so screen-reader users hear the effect of searching. */}
          <p className="text-muted-foreground shrink-0 text-xs" role="status" aria-live="polite">
            {visible.length} document{visible.length === 1 ? "" : "s"}
          </p>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={
              filtersActive ? (
                <Search />
              ) : activeFolder ? (
                <Folder />
              ) : view === "favorites" ? (
                <Star />
              ) : view === "recent" ? (
                <Clock />
              ) : (
                <Inbox />
              )
            }
            title={
              filtersActive ? "No matching documents" : emptyTitle(view, Boolean(activeFolder))
            }
            description={
              filtersActive
                ? "Try a different search or clear your filters."
                : emptyDescription(view, Boolean(activeFolder))
            }
            action={
              filtersActive ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setRoleFilter("ALL");
                    setTagFilter("");
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={cn(mode === "list" && "card overflow-hidden rounded-xl")}>
            {mode === "list" && (
              // Column headings for the table view; hidden from assistive tech
              // because each row already labels its own cells.
              <div
                className="border-border text-muted-foreground hidden items-center gap-4 border-b px-4 py-2.5 text-[10.5px] font-semibold tracking-[0.08em] uppercase sm:flex"
                aria-hidden
              >
                <span className="flex-1">Name</span>
                <span className="hidden w-56 lg:block">Tags</span>
                <span className="w-20">Access</span>
                <span className="hidden w-32 md:block">Last edited</span>
                <span className="w-24" />
              </div>
            )}
            <ul
              className={
                mode === "grid"
                  ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                  : "divide-border divide-y"
              }
            >
              {visible.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  doc={doc}
                  mode={mode}
                  folders={folders}
                  onToggleFavorite={() => toggleFavorite(doc)}
                  onMove={(folderId) => moveTo(doc, folderId)}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * First-run state for a brand-new workspace: the three things worth knowing
 * before the first keystroke, and one clear action.
 */
function FirstRun({ createAction }: { createAction: React.ReactNode }) {
  const tips = [
    {
      icon: WifiOff,
      title: "Works offline",
      body: "Documents save to this device first and sync when you reconnect.",
    },
    {
      icon: Users,
      title: "Invite collaborators",
      body: "Share as Editor or Viewer and see each other's cursors live.",
    },
    {
      icon: History,
      title: "Snapshot anytime",
      body: "Name a version and restore it later — nothing gets overwritten.",
    },
  ];

  return (
    <div className="card overflow-hidden rounded-xl">
      <div className="flex flex-col items-center px-6 pt-14 pb-12 text-center">
        <FirstDocumentArt />
        <h2 className="font-display mt-5 text-xl">Create your first document</h2>
        <p className="text-muted-foreground mt-1.5 max-w-md text-sm text-balance">
          Write from scratch or import a Markdown file. You can start typing immediately — even
          without a connection.
        </p>
        <div className="mt-6 flex items-center gap-2">{createAction}</div>
      </div>
      <ul className="border-border bg-subtle divide-border grid divide-y border-t sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {tips.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3 px-6 py-5">
            <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A fresh page with a waiting cursor and a "new" badge, for the first-run state. */
function FirstDocumentArt() {
  return (
    <svg viewBox="0 0 220 140" className="h-32 w-auto" fill="none" aria-hidden>
      <ellipse cx="110" cy="130" rx="78" ry="7" className="fill-muted" />
      <rect
        x="56"
        y="22"
        width="80"
        height="100"
        rx="10"
        className="fill-surface stroke-border"
        strokeWidth="1.5"
        transform="rotate(-8 96 72)"
      />
      <rect
        x="72"
        y="12"
        width="84"
        height="106"
        rx="10"
        className="fill-surface stroke-border-strong"
        strokeWidth="1.5"
      />
      <rect x="85" y="28" width="38" height="6" rx="3" className="fill-foreground" />
      <rect x="85" y="44" width="58" height="4" rx="2" className="fill-muted" />
      <rect x="85" y="54" width="50" height="4" rx="2" className="fill-muted" />
      <rect x="85" y="64" width="30" height="4" rx="2" className="fill-muted" />
      {/* The cursor, ready to type */}
      <rect x="118" y="60" width="2.5" height="12" rx="1.25" className="fill-primary" />
      <rect x="118" y="50" width="24" height="11" rx="3" className="fill-primary" />
      <rect x="122" y="54" width="16" height="3" rx="1.5" fill="#fff" opacity="0.9" />
      {/* New */}
      <circle cx="160" cy="24" r="14" className="fill-primary" />
      <path d="M154 24h12M160 18v12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Page preview for grid cards. It is abstract on purpose — the list never loads
 * document bodies, so it hints at "a document" rather than pretending to show
 * its contents. Neutral, like the thumbnails in Docs or Drive.
 */
function DocThumb({ title }: { title: string }) {
  const widths = [88, 72, 94, 60, 80];
  return (
    <div className="border-border bg-subtle relative h-32 overflow-hidden border-b" aria-hidden>
      <div className="border-border bg-surface absolute inset-x-8 top-5 bottom-0 rounded-t-md border border-b-0 px-4 pt-4 shadow-xs">
        <p className="truncate text-[11px] font-semibold">{title}</p>
        <div className="mt-2.5 space-y-1.5">
          {widths.map((width, i) => (
            <span
              key={i}
              className="bg-muted block h-1.5 rounded-full"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** The document glyph used in table rows: a small brand-blue page. */
function DocIcon() {
  return (
    <span className="bg-primary-subtle text-primary flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4">
      <FileText aria-hidden />
    </span>
  );
}

function emptyTitle(view: WorkspaceView, inFolder: boolean): string {
  if (inFolder) return "This folder is empty";
  return {
    all: "No documents",
    favorites: "No favourites yet",
    recent: "Nothing opened yet",
    shared: "Nothing shared with you yet",
  }[view];
}

function emptyDescription(view: WorkspaceView, inFolder: boolean): string {
  if (inFolder) return "Drag documents onto the folder, or use a document's menu → Move to.";
  return {
    all: "Create a document to get started.",
    favorites: "Star a document to pin it here.",
    recent: "Documents you open will appear here.",
    shared: "When someone shares a document with you, it shows up here.",
  }[view];
}

// ── Sidebar navigation ───────────────────────────────────────────────────────

function WorkspaceNav({
  view,
  activeFolderId,
  counts,
  folders,
  onNavigate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDropDocument,
}: {
  view: WorkspaceView | null;
  activeFolderId: string | null;
  counts: { all: number; favorites: number; shared: number; perFolder: Map<string, number> };
  folders: FolderSummary[];
  onNavigate: (next: { view?: WorkspaceView; folder?: string | null }) => void;
  onCreateFolder: (name: string) => Promise<boolean>;
  onRenameFolder: (folder: FolderSummary, name: string) => Promise<boolean>;
  onDeleteFolder: (folder: FolderSummary) => void;
  onDropDocument: (folderId: string, documentId: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const ok = await onCreateFolder(trimmed);
    setSaving(false);
    if (ok) {
      setName("");
      setCreating(false);
    }
  }

  const VIEWS: { id: WorkspaceView; label: string; icon: typeof Inbox; count?: number }[] = [
    { id: "all", label: "All documents", icon: Inbox, count: counts.all },
    { id: "favorites", label: "Favourites", icon: Star, count: counts.favorites },
    { id: "recent", label: "Recent", icon: Clock },
    { id: "shared", label: "Shared with me", icon: Users, count: counts.shared },
  ];

  return (
    <nav aria-label="Workspace" className="shrink-0 lg:w-56">
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {VIEWS.map(({ id, label, icon: Icon, count }) => (
          <li key={id} className="shrink-0">
            <NavItem
              active={view === id}
              onClick={() => onNavigate({ view: id })}
              icon={<Icon />}
              label={label}
              count={count}
            />
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between px-2">
        <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          Folders
        </h3>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCreating((value) => !value)}
          aria-label="New folder"
          aria-expanded={creating}
        >
          <FolderPlus />
        </Button>
      </div>

      {creating && (
        <form onSubmit={submit} className="mt-1 flex gap-1 px-1">
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Folder name"
            aria-label="New folder name"
            maxLength={60}
            className="h-8 text-xs"
            onKeyDown={(event) => {
              if (event.key === "Escape") setCreating(false);
            }}
          />
          <Button type="submit" size="sm" loading={saving} disabled={!name.trim()}>
            Add
          </Button>
        </form>
      )}

      {folders.length === 0 && !creating ? (
        <p className="text-muted-foreground mt-1 px-2 text-xs">
          Group documents your way — only you see your folders.
        </p>
      ) : (
        <ul className="-mx-1 mt-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {folders.map((folder) => (
            <li key={folder.id} className="shrink-0">
              <FolderItem
                folder={folder}
                count={counts.perFolder.get(folder.id) ?? 0}
                active={folder.id === activeFolderId}
                onOpen={() => onNavigate({ folder: folder.id })}
                onRename={(next) => onRenameFolder(folder, next)}
                onDelete={() => onDeleteFolder(folder)}
                onDropDocument={(documentId) => onDropDocument(folder.id, documentId)}
              />
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-md border px-2.5 text-[13px] whitespace-nowrap transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
        active
          ? "bg-primary-subtle text-primary border-transparent font-semibold"
          : "text-muted-foreground hover:bg-muted hover:text-foreground border-transparent",
      )}
    >
      {icon}
      <span className="flex-1 truncate text-left">{label}</span>
      {count !== undefined && <span className="text-xs tabular-nums opacity-70">{count}</span>}
    </button>
  );
}

function FolderItem({
  folder,
  count,
  active,
  onOpen,
  onRename,
  onDelete,
  onDropDocument,
}: {
  folder: FolderSummary;
  count: number;
  active: boolean;
  onOpen: () => void;
  onRename: (name: string) => Promise<boolean>;
  onDelete: () => void;
  onDropDocument: (documentId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(folder.name);

  async function commit() {
    const next = value.trim();
    if (!next || next === folder.name) {
      setValue(folder.name);
      setEditing(false);
      return;
    }
    const ok = await onRename(next);
    if (!ok) setValue(folder.name);
    setEditing(false);
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={value}
        maxLength={60}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") void commit();
          if (event.key === "Escape") {
            setValue(folder.name);
            setEditing(false);
          }
        }}
        aria-label="Folder name"
        className="h-8 text-xs"
      />
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center rounded-md transition-colors",
        dragOver && "bg-primary-subtle ring-primary ring-2",
      )}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        setDragOver(false);
        const documentId = event.dataTransfer.getData(DRAG_TYPE);
        if (documentId) {
          event.preventDefault();
          onDropDocument(documentId);
        }
      }}
    >
      <NavItem
        active={active}
        onClick={onOpen}
        icon={<Folder />}
        label={folder.name}
        count={count}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Folder options for ${folder.name}`}
          className="text-muted-foreground hover:text-foreground hidden rounded p-1 group-focus-within:block group-hover:block lg:block lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
        >
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem danger onSelect={onDelete}>
            <Trash2 />
            Delete folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ── Documents ────────────────────────────────────────────────────────────────

function ViewButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "rounded-[5px] p-1.5 transition-colors [&_svg]:size-4",
        active
          ? "bg-surface text-foreground shadow-xs"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}

function DocumentItem({
  doc,
  mode,
  folders,
  onToggleFavorite,
  onMove,
}: {
  doc: DocumentListItem;
  mode: ViewMode;
  folders: FolderSummary[];
  onToggleFavorite: () => void;
  onMove: (folderId: string | null) => void;
}) {
  const grid = mode === "grid";
  const maxTags = grid ? 3 : 2;

  const tags = doc.tags.length > 0 && (
    <span className="flex flex-wrap items-center gap-1">
      {doc.tags.slice(0, maxTags).map((tag) => (
        <span
          key={tag}
          className={cn("rounded px-1.5 py-0.5 text-[11px] leading-4 font-medium", tagTint(tag))}
        >
          {tag}
        </span>
      ))}
      {doc.tags.length > maxTags && (
        <span className="text-muted-foreground text-[11px]">+{doc.tags.length - maxTags}</span>
      )}
    </span>
  );

  const updated = (
    <time
      dateTime={doc.updatedAt}
      title={new Date(doc.updatedAt).toLocaleString()}
      className="text-muted-foreground text-xs"
      suppressHydrationWarning
    >
      {grid ? `Edited ${formatRelative(doc.updatedAt)}` : formatRelative(doc.updatedAt)}
    </time>
  );

  // The stretched link makes the whole item clickable with a single tab stop;
  // the action buttons sit above it in their own stacking context.
  const titleLink = (
    <Link href={`/documents/${doc.id}`} className="after:absolute after:inset-0 focus:outline-none">
      <span className="block truncate text-sm font-medium">{doc.title}</span>
    </Link>
  );

  // In the grid the whole action group is revealed at once by its wrapper.
  const hoverReveal = grid
    ? ""
    : "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100";

  const actions = (
    <div className="relative z-10 flex items-center gap-0.5">
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={doc.favorite}
        aria-label={
          doc.favorite ? `Remove ${doc.title} from favourites` : `Add ${doc.title} to favourites`
        }
        className={cn(
          "rounded-md p-1.5 transition-[color,opacity] [&_svg]:size-4",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
          doc.favorite
            ? "text-amber-500"
            : cn("text-muted-foreground hover:text-foreground", hoverReveal),
        )}
      >
        <Star className={cn(doc.favorite && "fill-current")} />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`More actions for ${doc.title}`}
          className={cn(
            "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring rounded-md p-1.5 transition-[color,opacity] focus-visible:ring-2 focus-visible:outline-none sm:data-[state=open]:opacity-100 [&_svg]:size-4",
            hoverReveal,
          )}
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onSelect={onToggleFavorite}>
            <Star />
            {doc.favorite ? "Remove from favourites" : "Add to favourites"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-1.5">
            <FolderInput className="size-3.5" aria-hidden />
            Move to
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={doc.folderId ?? "none"}
            onValueChange={(value) => onMove(value === "none" ? null : value)}
          >
            <DropdownMenuRadioItem value="none">No folder</DropdownMenuRadioItem>
            {folders.map((folder) => (
              <DropdownMenuRadioItem key={folder.id} value={folder.id}>
                <span className="truncate">{folder.name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {doc.role === "OWNER" && (
        <span
          className={cn(
            !grid && "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100",
          )}
        >
          <DeleteDocumentButton documentId={doc.id} title={doc.title} />
        </span>
      )}
    </div>
  );

  const dragProps = {
    draggable: true,
    onDragStart: (event: React.DragEvent) => {
      event.dataTransfer.setData(DRAG_TYPE, doc.id);
      event.dataTransfer.effectAllowed = "move";
    },
  };

  if (grid) {
    return (
      <li
        {...dragProps}
        className="card hover:border-border-strong group relative flex flex-col overflow-hidden rounded-xl transition-[border-color,box-shadow] hover:shadow-md"
      >
        <DocThumb title={doc.title} />
        {/* Actions float over the thumbnail so the card body stays compact. */}
        <div
          className={cn(
            "border-border bg-surface absolute top-2 right-2 z-10 rounded-md border p-0.5 shadow-xs transition-opacity",
            "sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100 sm:has-data-[state=open]:opacity-100",
          )}
        >
          {actions}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 flex-1">
              {titleLink}
              <span className="mt-0.5 flex items-center gap-1.5">
                {doc.favorite && (
                  <Star
                    className="size-3 shrink-0 fill-current text-amber-500"
                    aria-label="Favourite"
                  />
                )}
                {updated}
              </span>
            </span>
            <RoleBadge role={doc.role} size="sm" showIcon={false} className="shrink-0" />
          </div>
          {tags}
        </div>
      </li>
    );
  }

  // Table row. Column widths match the header in DocumentList.
  return (
    <li
      {...dragProps}
      className="hover:bg-subtle group relative flex items-center gap-4 px-3 py-3 transition-colors sm:px-4"
    >
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <DocIcon />
        <span className="min-w-0">
          {titleLink}
          {/* On small screens the columns collapse under the title. */}
          <span className="mt-0.5 flex items-center gap-2 md:hidden">{updated}</span>
        </span>
      </span>
      <span className="hidden w-56 lg:block">{tags}</span>
      <span className="hidden w-20 sm:block">
        <RoleBadge role={doc.role} size="sm" showIcon={false} />
      </span>
      <span className="hidden w-32 md:block">{updated}</span>
      <span className="flex w-24 justify-end">{actions}</span>
    </li>
  );
}
