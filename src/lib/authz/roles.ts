/**
 * Per-document roles and what each one is allowed to do.
 *
 * Roles are scoped to a document (a user can be an Owner of one doc and a
 * Viewer of another), so this lives in authz rather than on the User model.
 * The capability matrix is pure, testable logic — the single source of truth
 * that the REST API, the real-time server, and the RLS policies all defer to.
 */

export const ROLES = ["OWNER", "EDITOR", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export type Capability =
  "view" | "edit" | "createVersion" | "restoreVersion" | "manageSharing" | "deleteDocument";

const CAPABILITIES: Record<Role, readonly Capability[]> = {
  OWNER: ["view", "edit", "createVersion", "restoreVersion", "manageSharing", "deleteDocument"],
  EDITOR: ["view", "edit", "createVersion", "restoreVersion"],
  VIEWER: ["view"],
};

/** Whether a role is permitted to perform a capability. */
export function can(role: Role, capability: Capability): boolean {
  return CAPABILITIES[role].includes(capability);
}
