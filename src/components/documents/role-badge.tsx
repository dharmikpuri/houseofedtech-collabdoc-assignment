import type { Role } from "@/lib/authz/roles";
import { cn } from "@/lib/utils";

const LABELS: Record<Role, string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span
      className={cn(
        "border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {LABELS[role]}
    </span>
  );
}
