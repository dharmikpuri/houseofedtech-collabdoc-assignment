import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Button primitive.
 *
 * The original `variant="primary" | "ghost"` API is preserved so existing call
 * sites keep working; the extra variants and sizes are additive.
 *
 * `asChild` renders the styles onto a child element (e.g. a Next.js `<Link>`)
 * instead of a `<button>`, which keeps navigation semantics correct — a link
 * that looks like a button should still be a link.
 */
const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap",
    "transition-[background-color,border-color,color,box-shadow,opacity,transform,filter] duration-150",
    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
    "focus-visible:ring-offset-background focus-visible:outline-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:translate-y-px",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        // Primary actions: a solid brand fill.
        primary: "bg-primary-solid hover:bg-primary-solid-hover shadow-button text-white",
        secondary:
          "bg-surface text-foreground border-border hover:bg-subtle hover:border-border-strong border shadow-xs",
        ghost: "text-foreground hover:bg-muted",
        "danger-ghost": "text-danger hover:bg-danger-subtle",
        // On the dark closing band: a white fill, and an outlined companion.
        inverse: "text-band bg-white shadow-sm hover:bg-white/90",
        "inverse-outline": "border border-white/25 text-white hover:bg-white/10",
      },
      size: {
        sm: "h-8 px-2.5 text-xs [&_svg]:size-3.5",
        md: "h-9 px-3.5 text-sm [&_svg]:size-4",
        lg: "h-12 rounded-xl px-6 text-[15px] [&_svg]:size-4",
        // The big call to action in a marketing section.
        xl: "h-14 rounded-2xl px-9 text-base [&_svg]:size-4",
        "icon-sm": "size-8 [&_svg]:size-4",
        icon: "size-9 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Shows a spinner and blocks interaction while an action is in flight. */
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      // Tell assistive tech the control is busy rather than silently inert.
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="motion-essential animate-spin" aria-hidden />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { buttonVariants };
