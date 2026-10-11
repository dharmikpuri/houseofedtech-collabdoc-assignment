"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Shortest time the bar stays on screen, so fast navigations still read as motion. */
const MIN_VISIBLE_MS = 450;
/** Give up waiting (e.g. a link that never navigates) and finish anyway. */
const SAFETY_TIMEOUT_MS = 10_000;

type Run = { from: string; startedAt: number };

function urlKey(pathname: string, search: string): string {
  return `${pathname}?${new URLSearchParams(search).toString()}`;
}

/**
 * Slim progress bar at the top of the viewport for client-side navigations.
 *
 * It starts on an internal link click, trickles towards 90% while the next
 * route streams in, then completes once the URL has actually changed — never
 * sooner than MIN_VISIBLE_MS, so the motion is perceptible instead of a flicker.
 * Purely visual: navigation itself is untouched.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams.toString()}`;

  const [run, setRun] = useState<Run | null>(null);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Derived during render: the route we left has been replaced.
  const arrived = run !== null && key !== run.from;

  // Start on internal link clicks. Capture phase, because Next's <Link> calls
  // preventDefault itself during bubbling.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const from = urlKey(window.location.pathname, window.location.search);
      // Same page (or an in-page #hash jump): nothing will load.
      if (urlKey(url.pathname, url.search) === from) return;

      setRun({ from, startedAt: Date.now() });
      setProgress(12);
      setVisible(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Trickle forward while waiting; each step covers less of the remaining gap.
  useEffect(() => {
    if (!run || arrived) return;
    const trickle = window.setInterval(() => {
      setProgress((value) => value + (90 - value) * 0.12);
    }, 220);
    const safety = window.setTimeout(() => {
      setRun((current) => (current ? { ...current, from: "__timeout__" } : current));
    }, SAFETY_TIMEOUT_MS);
    return () => {
      window.clearInterval(trickle);
      window.clearTimeout(safety);
    };
  }, [run, arrived]);

  // Finish: fill to 100%, fade out, then reset.
  useEffect(() => {
    if (!run || !arrived) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - run.startedAt));
    const timers = [
      window.setTimeout(() => setProgress(100), wait),
      window.setTimeout(() => setVisible(false), wait + 280),
      window.setTimeout(() => {
        setRun(null);
        setProgress(0);
      }, wait + 580),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [run, arrived]);

  return (
    <div
      className="motion-essential pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5 print:hidden"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 300ms ease" }}
      aria-hidden
    >
      <div
        className="bg-primary-solid motion-essential h-full"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? "none" : "width 260ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
}
