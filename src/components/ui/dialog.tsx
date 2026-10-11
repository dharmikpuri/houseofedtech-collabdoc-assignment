"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Modal dialog built on Radix, which handles the accessibility work that is
 * easy to get wrong by hand: focus trapping, restoring focus to the trigger on
 * close, `aria-modal`, Escape-to-close, and inerting the page behind it.
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { showClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
          "data-[state=open]:animate-[fade-in_0.2s_ease-out]",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "bg-overlay border-border fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg",
          "-translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-lg",
          "data-[state=open]:animate-[scale-in_0.15s_cubic-bezier(0.16,1,0.3,1)]",
          "max-h-[calc(100dvh-4rem)] overflow-y-auto",
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground absolute top-4 right-4",
              "rounded-md p-1.5 transition-colors",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            )}
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-5 flex flex-col gap-1.5 pr-8", className)} {...props} />;
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-base font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}
