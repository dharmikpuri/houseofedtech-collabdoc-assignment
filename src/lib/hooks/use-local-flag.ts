"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "collabdoc:local-flag";

/**
 * A boolean preference persisted in localStorage and kept in sync across
 * components and tabs. Reads `false` during server rendering, so markup never
 * depends on storage the server can't see.
 */
export function useLocalFlag(key: string, fallback = false): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener(EVENT, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(EVENT, onChange);
      };
    },
    () => {
      try {
        const stored = localStorage.getItem(key);
        return stored === null ? fallback : stored === "1";
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );

  const set = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Storage unavailable: the preference just won't persist.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  return [value, set];
}
