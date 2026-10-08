/**
 * Hand-off between the Markdown importer (dashboard) and the new document's
 * editor. Kept in its own tiny module so the dashboard doesn't pull the whole
 * editor bundle in just to share a key.
 */
export const importStorageKey = (documentId: string) => `collabdoc:import:${documentId}`;

/** Written before the document is created, to fail fast if storage is full. */
export const PENDING_IMPORT_KEY = "collabdoc:import:pending";
