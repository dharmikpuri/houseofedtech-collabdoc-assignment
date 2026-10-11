import * as React from "react";
import { cn } from "@/lib/utils";

// ComponentProps (not InputHTMLAttributes) so `ref` is accepted and forwarded
// to the <input> — a plain prop on function components in React 19.
export type InputProps = React.ComponentProps<"input"> & {
  /** Renders an icon inside the field's leading edge (e.g. a search glyph). */
  icon?: React.ReactNode;
};

export function Input({ className, icon, ...props }: InputProps) {
  const field = (
    <input
      className={cn(
        "border-border bg-input text-foreground flex h-9 w-full rounded-md border px-3 text-sm shadow-xs",
        "placeholder:text-muted-foreground/80",
        "transition-[border-color,box-shadow] duration-150",
        "hover:border-border-strong",
        "focus-visible:border-primary focus-visible:ring-ring/20 focus-visible:ring-[3px] focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // `aria-invalid` is set by forms on validation failure; colour follows it
        // automatically so error styling never drifts from error state.
        "aria-invalid:border-danger aria-invalid:ring-danger/25",
        icon && "pl-9",
        className,
      )}
      {...props}
    />
  );

  if (!icon) return field;

  return (
    <div className="relative w-full min-w-0">
      <span
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 [&_svg]:size-4"
        aria-hidden
      >
        {icon}
      </span>
      {field}
    </div>
  );
}
