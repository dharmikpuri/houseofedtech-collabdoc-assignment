"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "bg-foreground text-background z-50 rounded-md px-2 py-1 text-xs font-medium shadow-md",
          "data-[state=delayed-open]:animate-[fade-in_0.12s_ease-out]",
          "max-w-64 text-balance",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

/**
 * Convenience wrapper for the common case of "hint text on one control".
 *
 * A tooltip is never the only source of a control's name — icon-only buttons
 * still carry their own `aria-label`, because tooltips don't surface reliably
 * for touch or screen-reader users.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 300,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
}) {
  if (!content) return <>{children}</>;

  return (
    <TooltipRoot delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align}>
        {content}
      </TooltipContent>
    </TooltipRoot>
  );
}
