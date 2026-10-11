"use client";

import { useState, type FormEvent } from "react";
import {
  Clock,
  Folder,
  FolderPlus,
  Inbox,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FolderSummary } from "@/lib/authz/folders";
import { DRAG_TYPE, type WorkspaceView } from "@/components/documents/list/types";

/** Views (all, favourites, recent, shared) and personal folders. */
export function WorkspaceNav({
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
    <nav aria-label="Workspace" className="shrink-0 lg:w-[clamp(11rem,14vw,14rem)]">
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
