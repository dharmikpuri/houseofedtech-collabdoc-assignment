"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme provider.
 *
 * `next-themes` writes the theme class onto <html> from a tiny inline script
 * that runs before paint, which is what prevents the white flash when a
 * dark-mode user loads the page. That script is why <html> needs
 * `suppressHydrationWarning` in the root layout — the server can't know the
 * stored preference, so the class legitimately differs on first render.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // Avoids transition flicker when toggling between themes.
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
