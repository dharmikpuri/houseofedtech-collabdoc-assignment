"use client";

import Link from "next/link";
import { FileText, FolderInput, MoreHorizontal, Star } from "lucide-react";

import { cn } from "@/lib/utils";
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
import { RoleBadge } from "@/components/documents/role-badge";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";
import { formatRelative } from "@/lib/format/relative-time";
import { tagTint } from "@/lib/tags";
import type { FolderSummary } from "@/lib/authz/folders";
import { documentPath } from "@/config/routes";
import { DRAG_TYPE, type DocumentListItem, type ViewMode } from "@/components/documents/list/types";

/** One document, as a table row or a grid card. */
export function DocumentItem({
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
    <Link href={documentPath(doc.id)} className="after:absolute after:inset-0 focus:outline-none">
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
          {tags && <span className="mt-1.5 block xl:hidden">{tags}</span>}
        </span>
      </span>
      <span className="hidden w-[clamp(8rem,12vw,14rem)] xl:block">{tags}</span>
      <span className="hidden w-20 sm:block">
        <RoleBadge role={doc.role} size="sm" showIcon={false} />
      </span>
      <span className="hidden w-32 md:block">{updated}</span>
      <span className="flex w-24 justify-end">{actions}</span>
    </li>
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
