import { PERSONAS } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Building blocks shared by the landing illustrations: the demo personas'
 * colours, avatars, cards, text lines and the highlighted "key step".
 */

export const AISHA = PERSONAS.aisha.color;
export const MARCO = PERSONAS.marco.color;
export const PRIYA = PERSONAS.priya.color;

export function Avatar({
  letter,
  color,
  className,
}: {
  letter: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {letter}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("border-border bg-surface rounded-xl border shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Lines({ widths }: { widths: string[] }) {
  return (
    <div className="space-y-1.5">
      {widths.map((width, index) => (
        <span key={index} className="bg-muted block h-1.5 rounded-full" style={{ width }} />
      ))}
    </div>
  );
}

export function Inserted({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="rounded-[3px] px-0.5"
      style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)` }}
    >
      {children}
    </span>
  );
}

/** A highlighted step: the moment the system does the interesting thing. */
export function KeyStep({
  icon,
  title,
  detail,
  tone = "primary",
  live = false,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  detail?: string;
  tone?: "primary" | "success" | "danger";
  /** Pings every few seconds: this is where the flow's work happens. */
  live?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-surface flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 shadow-sm",
        tone === "primary" && "border-primary/60",
        tone === "success" && "border-success/60",
        tone === "danger" && "border-danger/50",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]",
          live && "animate-[step-ping_2.8s_ease-out_infinite]",
          tone === "primary" && "bg-primary-subtle text-primary",
          tone === "success" && "bg-success-subtle text-success",
          tone === "danger" && "bg-danger-subtle text-danger",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "text-[12.5px] font-bold",
            tone === "primary" && "text-primary",
            tone === "success" && "text-success",
            tone === "danger" && "text-danger",
          )}
        >
          {title}
        </p>
        {detail && <p className="text-muted-foreground truncate text-[11px]">{detail}</p>}
      </div>
    </div>
  );
}
