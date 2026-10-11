import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/marketing/parts";

/**
 * Layout primitives for the public pages. Every marketing section uses
 * `Section` for its background, vertical rhythm and container, and
 * `SectionHeader` for its label + headline + intro, so spacing and type
 * change in one place.
 */

export function Section({
  id,
  tone = "default",
  labelledBy,
  className,
  containerClassName,
  children,
}: {
  id?: string;
  /** `subtle` is the cool grey used for alternating sections. */
  tone?: "default" | "subtle";
  labelledBy?: string;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("section-y scroll-mt-20", tone === "subtle" && "bg-subtle", className)}
    >
      <div className={cn("container-page", containerClassName)}>{children}</div>
    </section>
  );
}

export function SectionHeader({
  id,
  label,
  title,
  accent,
  description,
  align = "center",
  accentOnNewLine = false,
  className,
}: {
  /** Id for the heading, to label its section. */
  id?: string;
  label?: string;
  title: string;
  /** The emphasised phrase, in the brand colour. */
  accent?: string;
  description?: string;
  align?: "center" | "start";
  accentOnNewLine?: boolean;
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div className={cn(centered && "mx-auto max-w-2xl text-center", className)}>
      {label && <SectionLabel>{label}</SectionLabel>}
      <h2 id={id} className={cn("section-title text-balance", label && "mt-5")}>
        {title}
        {accent && (
          <>
            {" "}
            <span className={cn("text-primary", accentOnNewLine && "block")}>{accent}</span>
          </>
        )}
      </h2>
      {description && (
        <p
          className={cn(
            "text-muted-foreground text-lg leading-relaxed",
            centered ? "mt-5 text-balance" : "mt-6",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
