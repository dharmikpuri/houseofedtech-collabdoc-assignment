import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared empty/error/zero-result state.
 *
 * Every empty surface in the app routes through this so the tone and spacing
 * stay consistent, and so each one is required to offer a next action rather
 * than leaving the user at a dead end.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  tone = "neutral",
  size = "md",
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  tone?: "neutral" | "danger";
  /** `sm` drops the card chrome for use inside narrow side panels. */
  size?: "md" | "sm";
}) {
  const small = size === "sm";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center overflow-hidden text-center",
        small ? "px-3 py-10" : "card rounded-xl px-6 py-14",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            "mb-4 flex items-center justify-center rounded-lg border [&_svg]:size-5",
            small ? "size-10" : "size-11",
            tone === "danger"
              ? "border-danger/25 bg-danger-subtle text-danger"
              : "border-border bg-subtle text-muted-foreground",
          )}
          aria-hidden
        >
          {icon}
        </div>
      )}
      <p
        className={cn(
          "text-foreground relative font-semibold tracking-tight",
          small ? "text-sm" : "text-base",
        )}
      >
        {title}
      </p>
      {description && (
        <p className="text-muted-foreground relative mt-1.5 max-w-sm text-sm text-balance">
          {description}
        </p>
      )}
      {action && <div className="relative mt-6 flex items-center gap-2">{action}</div>}
    </div>
  );
}
