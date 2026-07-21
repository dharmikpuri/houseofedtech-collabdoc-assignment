import { cn } from "@/lib/utils";

/**
 * Communicates the local-first guarantee to the user: content is stored in the
 * browser (IndexedDB) with no network involved. Real network sync status lands
 * in the sync-engine phase; this only reflects local persistence.
 */
export function LocalSaveIndicator({ synced }: { synced: boolean }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn("text-xs", synced ? "text-muted-foreground" : "text-amber-600")}
    >
      {synced ? "Saved locally" : "Loading local copy…"}
    </p>
  );
}
