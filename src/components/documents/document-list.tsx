"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  Folder,
  Inbox,
  LayoutGrid,
  List as ListIcon,
  Search,
  SlidersHorizontal,
  Star,
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
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { confirmToast } from "@/components/ui/confirm-toast";
import type { Role } from "@/lib/authz/roles";
import type { FolderSummary } from "@/lib/authz/folders";
import { FirstRun } from "@/components/documents/list/first-run";
import { WorkspaceNav } from "@/components/documents/list/workspace-nav";
import { DocumentItem } from "@/components/documents/list/document-item";
import {
  type DocumentListItem,
  type ViewMode,
  type WorkspaceView,
} from "@/components/documents/list/types";

export type { DocumentListItem } from "@/components/documents/list/types";

type SortKey = "recent" | "title" | "role";
type RoleFilter = "ALL" | Role;

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
                <span className="hidden w-[clamp(8rem,12vw,14rem)] xl:block">Tags</span>
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
