import { cn } from "@/lib/utils";

/**
 * The heading block at the top of an app page: title, an optional line of
 * description, and optional actions aligned to the right on wider screens.
 * Every app page uses it, so headings share one size and rhythm.
 */
export function PageHeader({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Extra content under the description (notes, badges). */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}
    >
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">{description}</p>
        )}
        {children}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
