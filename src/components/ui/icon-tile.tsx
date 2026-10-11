import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * A tinted tile holding an icon — the leading mark on feature cards, list
 * rows and panel headers. One component so the size, shape and tint of every
 * icon tile change together.
 */
const iconTileVariants = cva("flex shrink-0 items-center justify-center", {
  variants: {
    size: {
      sm: "size-8 [&_svg]:size-4",
      md: "size-10 [&_svg]:size-5",
      lg: "size-11 [&_svg]:size-5",
    },
    shape: {
      circle: "rounded-full",
      rounded: "rounded-lg",
    },
    tone: {
      primary: "bg-primary-subtle text-primary",
      surface: "bg-surface text-primary border-primary/15 border shadow-xs",
      success: "bg-success-subtle text-success",
      warning: "bg-warning-subtle text-warning",
      danger: "bg-danger-subtle text-danger",
    },
  },
  defaultVariants: { size: "md", shape: "circle", tone: "primary" },
});

export function IconTile({
  children,
  className,
  size,
  shape,
  tone,
}: VariantProps<typeof iconTileVariants> & {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn(iconTileVariants({ size, shape, tone }), className)} aria-hidden>
      {children}
    </span>
  );
}
