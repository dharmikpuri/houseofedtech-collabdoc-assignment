"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Route-level error boundary.
 *
 * The raw error message is deliberately not rendered — it can contain server
 * internals. The digest is shown instead so a user can quote it in a bug report
 * and it can be matched against server logs.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // Report to the server so client crashes show up alongside server errors.
    // keepalive lets it complete even if the user navigates away.
    void fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        message: String(error.message ?? "Unknown error").slice(0, 1_000),
        stack: error.stack?.slice(0, 8_000),
        digest: error.digest,
        path: window.location.pathname,
      }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg items-center px-4">
      <EmptyState
        className="w-full"
        tone="danger"
        icon={<TriangleAlert />}
        title="Something went wrong"
        description={
          <>
            An unexpected error occurred. Your document edits are stored locally and are safe.
            {error.digest && (
              <span className="border-border bg-subtle text-muted-foreground mt-3 block rounded-md border px-2 py-1 font-mono text-[11px]">
                Reference: {error.digest}
              </span>
            )}
          </>
        }
        action={
          <>
            <Button onClick={reset}>
              <RefreshCw />
              Try again
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Go to documents</Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
