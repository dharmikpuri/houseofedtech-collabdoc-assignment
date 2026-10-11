import { cn } from "@/lib/utils";
import { PERSONAS } from "@/config/site";

/**
 * CollabDoc's loading indicator: the product's idea in motion. Two edit
 * streams pulse into a merge point, and the document's lines are written one
 * after another — separate edits becoming one document.
 *
 * Loading feedback is exempt from the reduced-motion rule (`motion-essential`
 * on every animated part), because a frozen indicator stops saying "working".
 */

const AISHA = PERSONAS.aisha.color;
const MARCO = PERSONAS.marco.color;

const STREAM_A = "M6 18H16C30 18 30 40 44 40";
const STREAM_B = "M6 62H16C30 62 30 40 44 40";

/** Document lines: y position, end x, start delay (s). */
const LINES: [number, number, number][] = [
  [24, 104, 0],
  [34, 99, 0.3],
  [44, 105, 0.6],
  [54, 90, 0.9],
];

export function MergeLoader({
  label = "Loading…",
  detail,
  size = "md",
  className,
}: {
  label?: string;
  detail?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center text-center", className)}
    >
      <svg viewBox="0 0 120 80" fill="none" className={size === "sm" ? "w-20" : "w-28"} aria-hidden>
        {/* Two edit streams: a faint track with a pulse travelling along it */}
        <g strokeWidth="2.5" strokeLinecap="round">
          <path d={STREAM_A} stroke={AISHA} opacity="0.22" />
          <path d={STREAM_B} stroke={MARCO} opacity="0.22" />
          <path
            d={STREAM_A}
            pathLength={100}
            stroke={AISHA}
            strokeDasharray="24 76"
            className="motion-essential animate-[dash-travel_1.6s_linear_infinite]"
          />
          <path
            d={STREAM_B}
            pathLength={100}
            stroke={MARCO}
            strokeDasharray="24 76"
            className="motion-essential animate-[dash-travel_1.6s_linear_infinite] [animation-delay:-0.8s]"
          />
          <path d="M44 40H63" className="stroke-primary" />
        </g>

        {/* The merge point */}
        <circle
          cx="44"
          cy="40"
          r="4"
          className="fill-primary motion-essential origin-center animate-[node-beat_0.8s_ease-in-out_infinite] [transform-box:fill-box]"
        />

        {/* The document, being written */}
        <rect
          x="64"
          y="8"
          width="50"
          height="64"
          rx="8"
          strokeWidth="1.5"
          className="fill-surface stroke-border-strong"
        />
        <g strokeWidth="3" strokeLinecap="round">
          {LINES.map(([y, x2, delay]) => (
            <g key={y}>
              <path d={`M73 ${y}H${x2}`} className="stroke-muted" />
              <path
                d={`M73 ${y}H${x2}`}
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset="100"
                className="stroke-primary motion-essential animate-[line-write_2.4s_ease-in-out_infinite]"
                style={{ animationDelay: `${delay}s` }}
              />
            </g>
          ))}
        </g>
      </svg>

      {label && <p className="mt-3 text-sm font-medium">{label}</p>}
      {detail && <p className="text-muted-foreground mt-0.5 text-xs">{detail}</p>}
    </div>
  );
}
