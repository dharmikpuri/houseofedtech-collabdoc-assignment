"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CloudOff,
  FileText,
  Laptop,
  RefreshCw,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { PERSONAS } from "@/config/site";

/**
 * The hero: the product's core behaviour, playable.
 *
 * Two devices hold the same sentence. One goes offline; both keep editing;
 * on reconnect the edits merge with no conflict. It loops on its own, and the
 * visitor can take over with the network switch — after that it only moves
 * when they move it. This is a scripted illustration of what the real sync
 * engine does (the /lab page runs the real thing).
 */

type Phase = "synced" | "offline" | "merged";

const DURATION: Record<Phase, number> = { synced: 2600, offline: 4600, merged: 4600 };
const NEXT: Record<Phase, Phase> = { synced: "offline", offline: "merged", merged: "synced" };

const AISHA = PERSONAS.aisha;
const MARCO = PERSONAS.marco;

const STEPS: { id: Phase; label: string }[] = [
  { id: "synced", label: "In sync" },
  { id: "offline", label: "Offline" },
  { id: "merged", label: "Merged" },
];

export function HeroSyncDemo() {
  const [phase, setPhase] = useState<Phase>("synced");
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setPhase((current) => NEXT[current]), DURATION[phase]);
    return () => window.clearTimeout(timer);
  }, [phase, auto]);

  const offline = phase === "offline";

  function toggleNetwork() {
    setAuto(false);
    // Cutting the network takes Marco offline; restoring it merges.
    setPhase((current) => (current === "offline" ? "merged" : "offline"));
  }

  return (
    <div className="border-border bg-surface overflow-hidden rounded-2xl border text-left shadow-lg">
      {/* Title bar: document, timeline, network switch */}
      <div className="border-border bg-subtle flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5">
        <p className="flex items-center gap-2 text-sm font-medium">
          <FileText className="text-primary size-4" aria-hidden />
          Launch plan
        </p>

        <ol
          className="text-muted-foreground mx-auto hidden items-center gap-1.5 text-xs font-medium sm:flex"
          aria-hidden
        >
          {STEPS.map((step, index) => (
            <li key={step.id} className="flex items-center gap-1.5">
              {index > 0 && <span className="bg-border-strong h-px w-5" />}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 transition-colors",
                  phase === step.id && "bg-ink text-ink-foreground",
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          role="switch"
          aria-checked={!offline}
          onClick={toggleNetwork}
          className="border-border bg-surface hover:border-border-strong ml-auto inline-flex items-center gap-2 rounded-full border py-1 pr-1 pl-3 text-xs font-medium shadow-xs transition-colors sm:ml-0"
        >
          Marco&apos;s network
          <span
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors",
              offline ? "bg-border-strong" : "bg-primary-solid",
            )}
            aria-hidden
          >
            <span
              className={cn(
                "absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-[left]",
                offline ? "left-0.5" : "left-[18px]",
              )}
            />
          </span>
        </button>
      </div>

      {/* Two devices */}
      <div className="divide-border grid divide-y md:grid-cols-[1.25fr_1fr] md:divide-x md:divide-y-0">
        <Device
          icon={<Laptop className="size-4" aria-hidden />}
          owner="Aisha"
          device="Laptop"
          status={{ tone: "online", label: "Online" }}
        >
          We ship
          {phase !== "synced" && (
            <Inserted by={AISHA} showCaret={offline}>
              {" "}
              the offline editor
            </Inserted>
          )}{" "}
          on Friday
          {phase === "merged" && <Inserted by={MARCO}>, after QA sign-off</Inserted>}.
        </Device>

        <Device
          icon={<Smartphone className="size-4" aria-hidden />}
          owner="Marco"
          device="Phone"
          status={
            offline
              ? { tone: "offline", label: "Offline · 2 edits saved here" }
              : { tone: "online", label: "Online" }
          }
        >
          We ship
          {phase === "merged" && <Inserted by={AISHA}> the offline editor</Inserted>} on Friday
          {phase !== "synced" && (
            <Inserted by={MARCO} showCaret={offline}>
              , after QA sign-off
            </Inserted>
          )}
          .
        </Device>
      </div>

      {/* What just happened, in words (also the accessible description). */}
      <p
        className="border-border bg-subtle flex min-h-11 items-center gap-2.5 border-t px-4 py-2.5 text-sm"
        role="status"
        aria-live="polite"
      >
        {phase === "synced" && (
          <>
            <Wifi className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <span className="text-muted-foreground">Both devices hold the same document.</span>
          </>
        )}
        {phase === "offline" && (
          <>
            <CloudOff className="text-warning size-4 shrink-0" aria-hidden />
            <span>
              <span className="font-medium">Marco is offline.</span>{" "}
              <span className="text-muted-foreground">
                Both keep writing — nothing blocks, nothing is lost.
              </span>
            </span>
          </>
        )}
        {phase === "merged" && (
          <>
            <span className="bg-primary-solid flex size-4 shrink-0 items-center justify-center rounded-full text-white">
              <Check className="size-3" strokeWidth={3} aria-hidden />
            </span>
            <span>
              <span className="font-medium">Reconnected and merged.</span>{" "}
              <span className="text-muted-foreground">Both edits kept, 0 conflicts.</span>
            </span>
          </>
        )}
      </p>
    </div>
  );
}

function Device({
  icon,
  owner,
  device,
  status,
  children,
}: {
  icon: React.ReactNode;
  owner: string;
  device: string;
  status: { tone: "online" | "offline"; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-2">
        <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
          {icon}
          <span>
            <span className="text-foreground">{owner}</span> · {device}
          </span>
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
            status.tone === "online"
              ? "bg-success-subtle text-success"
              : "bg-warning-subtle text-warning",
          )}
        >
          {status.tone === "online" ? (
            <RefreshCw className="size-3" aria-hidden />
          ) : (
            <WifiOff className="size-3" aria-hidden />
          )}
          {status.label}
        </span>
      </div>

      {/* The page */}
      <div className="flex-1 px-5 pt-5 pb-7 sm:px-7">
        <p className="font-display text-xl">Launch plan</p>
        <p className="mt-2 text-[15px] leading-8">{children}</p>
        <div className="mt-4 space-y-2.5" aria-hidden>
          <span className="bg-muted block h-2.5 w-[88%] rounded-full" />
          <span className="bg-muted block h-2.5 w-[62%] rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Text a collaborator added, tinted in their colour, optionally with their caret. */
function Inserted({
  by,
  showCaret = false,
  children,
}: {
  by: { name: string; color: string };
  showCaret?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className="animate-[fade-in_0.5s_ease-out] rounded-[3px]"
      style={{ backgroundColor: `color-mix(in oklab, ${by.color} 16%, transparent)` }}
    >
      {children}
      {showCaret && (
        <span
          className="relative ml-px inline-block h-[1.1em] w-[2px] translate-y-[0.18em]"
          style={{ backgroundColor: by.color }}
          aria-hidden
        >
          <span
            className="absolute bottom-full left-0 rounded-[3px] rounded-bl-none px-1 py-px text-[10px] leading-3 font-semibold whitespace-nowrap text-white"
            style={{ backgroundColor: by.color }}
          >
            {by.name}
          </span>
        </span>
      )}
    </span>
  );
}
