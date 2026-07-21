"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production only.
 *
 * In development we deliberately skip it: Next's dev server relies on HMR and
 * uncached assets, and a caching service worker would serve stale files. To
 * test offline behaviour, run a production build (`npm run build && npm start`).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failing must never break the app — offline is an enhancement.
      });
    };

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
