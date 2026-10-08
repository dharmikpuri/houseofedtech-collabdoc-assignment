import {
  Check,
  Clock,
  CloudOff,
  Database,
  FileText,
  History,
  Lock,
  Minus,
  RotateCcw,
  Server,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Coded illustrations for the landing page. Each one is a faithful miniature of
 * how the feature actually behaves — real interface pieces rather than stock
 * metaphors. All are decorative (`aria-hidden`); the surrounding copy carries
 * the meaning.
 */

const AISHA = "#e5484d";
const MARCO = "#0e9f8e";

function Person({
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
        "flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white",
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {letter}
    </span>
  );
}

/** Keystrokes land on the device and queue until the network returns. */
export function OfflineArt() {
  const queue = [
    "Edited “Launch checklist”",
    "Saved version “Before review”",
    "Added tag “planning”",
  ];
  return (
    <div className="flex h-full items-center justify-center gap-4 px-6" aria-hidden>
      {/* The document, saving locally */}
      <div className="border-border bg-surface w-[46%] max-w-52 rounded-xl border p-3.5 shadow-md">
        <div className="flex items-center gap-1.5">
          <FileText className="text-primary size-3.5" />
          <span className="truncate text-[11px] font-semibold">Q3 launch plan</span>
        </div>
        <div className="mt-3 space-y-1.5">
          <span className="bg-muted block h-1.5 w-full rounded-full" />
          <span className="bg-muted block h-1.5 w-[84%] rounded-full" />
          <span className="flex items-center gap-0.5">
            <span className="bg-muted block h-1.5 w-[58%] rounded-full" />
            <span className="bg-primary block h-3 w-0.5 rounded-full" />
          </span>
        </div>
        <div className="bg-success-subtle text-success mt-3.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold">
          <Database className="size-3" />
          Saved on this device
        </div>
      </div>

      {/* The outbox */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            Sync queue
          </p>
          <span className="bg-warning-subtle text-warning inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold">
            <CloudOff className="size-2.5" />
            Offline
          </span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {queue.map((item, index) => (
            <li
              key={item}
              className="border-border bg-surface flex items-center gap-2 rounded-lg border px-2.5 py-1.5 shadow-xs"
              style={{ opacity: 1 - index * 0.14 }}
            >
              <Clock className="text-muted-foreground size-3 shrink-0" />
              <span className="truncate text-[10.5px]">{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-2 text-[10px]">
          Sends in order when you&apos;re back.
        </p>
      </div>
    </div>
  );
}

/** Two people's concurrent edits converge to the same document. */
export function MergeArt() {
  return (
    <div className="relative h-full" aria-hidden>
      <svg viewBox="0 0 360 200" className="h-full w-full" fill="none">
        {/* Streams */}
        <path
          d="M58 62 C 150 62, 150 100, 232 100"
          stroke={AISHA}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M58 138 C 150 138, 150 100, 232 100"
          stroke={MARCO}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M232 100 H 296"
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Merge point */}
        <circle cx="232" cy="100" r="11" className="fill-primary/15" />
        <circle cx="232" cy="100" r="5.5" className="fill-primary" />
        {/* People */}
        <circle cx="46" cy="62" r="13" fill={AISHA} />
        <text
          x="46"
          y="66"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="#fff"
          fontFamily="var(--font-inter), sans-serif"
        >
          A
        </text>
        <circle cx="46" cy="138" r="13" fill={MARCO} />
        <text
          x="46"
          y="142"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="#fff"
          fontFamily="var(--font-inter), sans-serif"
        >
          M
        </text>
        {/* Result */}
        <rect
          x="296"
          y="82"
          width="30"
          height="36"
          rx="5"
          className="fill-surface stroke-border-strong"
          strokeWidth="1.5"
        />
        <path
          d="M303 93h16M303 100h16M303 107h10"
          className="stroke-primary"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Labels */}
        <g
          fontFamily="var(--font-inter), sans-serif"
          fontSize="10.5"
          className="fill-muted-foreground"
        >
          <text x="70" y="50">
            Aisha · laptop
          </text>
          <text x="70" y="160">
            Marco · phone, offline
          </text>
          <text x="232" y="128" textAnchor="middle" className="fill-foreground" fontWeight="600">
            merge
          </text>
        </g>
      </svg>
      {/* What each of them typed */}
      <span
        className="absolute top-[14%] left-[44%] rounded-md px-1.5 py-0.5 text-[10px] font-medium"
        style={{ backgroundColor: `${AISHA}1f`, color: AISHA }}
      >
        + the offline editor
      </span>
      <span
        className="absolute bottom-[12%] left-[48%] rounded-md px-1.5 py-0.5 text-[10px] font-medium"
        style={{ backgroundColor: `${MARCO}1f`, color: MARCO }}
      >
        + after QA sign-off
      </span>
    </div>
  );
}

/** Named snapshots; restoring replays old content as a new forward edit. */
export function HistoryArt() {
  const rows = [
    { v: "v12", name: "Before review", who: "A", color: AISHA, when: "2 min ago", current: true },
    { v: "v11", name: "Pricing draft", who: "M", color: MARCO, when: "1 hour ago" },
    { v: "v10", name: "First outline", who: "A", color: AISHA, when: "Tuesday", restore: true },
  ];
  return (
    <div className="flex h-full flex-col justify-center px-6" aria-hidden>
      <ol className="relative space-y-2">
        <span className="bg-border absolute top-3 bottom-3 left-[5px] w-px" />
        {rows.map((row) => (
          <li key={row.v} className="relative flex items-center gap-3">
            <span
              className={cn(
                "relative z-10 size-[11px] shrink-0 rounded-full border-2",
                row.current ? "border-primary bg-primary" : "border-border-strong bg-surface",
              )}
            />
            <div className="border-border bg-surface flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 py-2 shadow-xs">
              <Person letter={row.who} color={row.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold">{row.name}</p>
                <p className="text-muted-foreground text-[9.5px]">
                  {row.v} · {row.when}
                </p>
              </div>
              {row.current && (
                <span className="bg-primary-subtle text-primary shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold">
                  Current
                </span>
              )}
              {row.restore && (
                <span className="bg-primary-solid inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-semibold text-white">
                  <RotateCcw className="size-2.5" />
                  Restore
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground mt-3 flex items-center gap-1.5 pl-6 text-[10px]">
        <History className="size-3" />
        Your current draft is snapshotted first.
      </p>
    </div>
  );
}

/** Grounded Q&A over only the documents the asker can open. */
export function AiArt() {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 px-6" aria-hidden>
      <div className="bg-primary-solid ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md px-3 py-1.5 text-[11.5px] text-white">
        What&apos;s still blocking the launch?
      </div>
      <div className="border-border bg-surface max-w-[92%] rounded-2xl rounded-bl-md border px-3 py-2.5 text-[11.5px] leading-relaxed shadow-xs">
        The share-link security review is the only open item
        <sup className="text-primary ml-0.5 text-[9px] font-bold">1</sup>. Rollout regions are
        agreed but not yet listed
        <sup className="text-primary ml-0.5 text-[9px] font-bold">2</sup>.
        <div className="mt-2 flex flex-wrap gap-1">
          {["Q3 launch plan", "Rollout sheet"].map((source, i) => (
            <span
              key={source}
              className="border-border bg-subtle text-muted-foreground inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px]"
            >
              <span className="text-primary font-bold">{i + 1}</span>
              <FileText className="size-2.5" />
              {source}
            </span>
          ))}
        </div>
      </div>
      <p className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
        <Lock className="size-3" />
        Sources limited to documents you can open
      </p>
    </div>
  );
}

/** The capability matrix, exactly as enforced. */
export function RolesArt() {
  const caps = [
    { label: "View", roles: [true, true, true] },
    { label: "Edit", roles: [true, true, false] },
    { label: "Save versions", roles: [true, true, false] },
    { label: "Share", roles: [true, false, false] },
    { label: "Delete", roles: [true, false, false] },
  ];
  return (
    <div className="flex h-full items-center justify-center px-6" aria-hidden>
      <div className="border-border bg-surface w-full max-w-xs overflow-hidden rounded-xl border text-[10.5px] shadow-md">
        <div className="border-border bg-subtle text-muted-foreground grid grid-cols-[1fr_repeat(3,46px)] border-b px-3 py-2 font-semibold">
          <span>Capability</span>
          <span className="text-center">Owner</span>
          <span className="text-center">Editor</span>
          <span className="text-center">Viewer</span>
        </div>
        {caps.map((cap) => (
          <div
            key={cap.label}
            className="border-border grid grid-cols-[1fr_repeat(3,46px)] items-center border-b px-3 py-1.5 last:border-0"
          >
            <span className="font-medium">{cap.label}</span>
            {cap.roles.map((allowed, i) => (
              <span key={i} className="flex justify-center">
                {allowed ? (
                  <span className="bg-primary-subtle text-primary flex size-4 items-center justify-center rounded-full">
                    <Check className="size-2.5" strokeWidth={3.5} />
                  </span>
                ) : (
                  <Minus className="text-muted-foreground/40 size-3.5" />
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Three independent enforcement layers every request passes through. */
export function SecurityArt() {
  const layers = [
    { icon: ShieldCheck, label: "REST API", detail: "Capability check · rate limit · 1 MB cap" },
    { icon: Server, label: "Real-time server", detail: "Signed 60 s token · role per connection" },
    { icon: Database, label: "Postgres", detail: "Row-level security per user" },
  ];
  return (
    <div className="flex h-full flex-col justify-center px-6" aria-hidden>
      {layers.map(({ icon: Icon, label, detail }, i) => (
        <div key={label}>
          {i > 0 && <span className="bg-border-strong mx-auto block h-3 w-px" />}
          <div className="border-border bg-surface flex items-center gap-3 rounded-xl border px-3 py-2.5 shadow-xs">
            <span className="bg-primary-subtle text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-semibold">{label}</p>
              <p className="text-muted-foreground truncate text-[10px]">{detail}</p>
            </div>
            <span className="bg-success-subtle text-success flex size-5 shrink-0 items-center justify-center rounded-full">
              <Check className="size-3" strokeWidth={3} />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
