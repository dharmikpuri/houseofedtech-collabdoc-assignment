import { Crown, Eye, PencilLine } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { Role } from "@/lib/authz/roles";

const ROLE_META: Record<
  Role,
  { label: string; icon: typeof Crown; variant: BadgeProps["variant"] }
> = {
  OWNER: { label: "Owner", icon: Crown, variant: "primary" },
  EDITOR: { label: "Editor", icon: PencilLine, variant: "info" },
  VIEWER: { label: "Viewer", icon: Eye, variant: "neutral" },
};

export function RoleBadge({
  role,
  className,
  showIcon = true,
  size = "md",
}: {
  role: Role;
  className?: string;
  showIcon?: boolean;
  size?: BadgeProps["size"];
}) {
  const { label, icon: Icon, variant } = ROLE_META[role];

  return (
    <Badge variant={variant} size={size} className={className}>
      {showIcon && <Icon aria-hidden />}
      {label}
    </Badge>
  );
}
