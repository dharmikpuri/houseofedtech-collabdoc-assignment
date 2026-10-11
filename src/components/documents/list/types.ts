import type { Role } from "@/lib/authz/roles";

/** Shared shapes and constants for the document list and its parts. */

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

export type ViewMode = "list" | "grid";

export type WorkspaceView = "all" | "favorites" | "recent" | "shared";

/** Drag-and-drop payload type for moving a document into a folder. */
export const DRAG_TYPE = "application/x-collabdoc-document";
