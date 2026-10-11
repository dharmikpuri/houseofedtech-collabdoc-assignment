"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

/**
 * Non-modal floating panel. Radix handles focus management, Escape-to-close and
 * outside-click dismissal, and wires `aria-expanded`/`aria-controls` onto the
 * trigger.
 */
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  className,
  align = "start",
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-overlay border-border z-50 w-72 rounded-lg border p-3 shadow-md outline-none",
          "data-[state=open]:animate-[scale-in_0.15s_cubic-bezier(0.16,1,0.3,1)]",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
