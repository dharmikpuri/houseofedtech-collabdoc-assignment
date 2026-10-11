"use client";

import type { JSONContent } from "@tiptap/react";

/**
 * Client access to version snapshots.
 *
 * Snapshots are immutable once written, so fetched content is cached for the
 * session: comparing, re-comparing and then restoring the same version costs
 * one request. The cache is bounded (least-recently-used eviction) because a
 * snapshot can be up to 1 MB.
 */

const MAX_CACHED = 20;
const cache = new Map<string, JSONContent>();

export class VersionFetchError extends Error {
  constructor(
    message: string,
    readonly offline: boolean,
  ) {
    super(message);
    this.name = "VersionFetchError";
  }
}

export async function fetchVersionContent(
  documentId: string,
  versionId: string,
): Promise<JSONContent> {
  const key = `${documentId}:${versionId}`;
  const hit = cache.get(key);
  if (hit) {
    // Refresh recency.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }

  let res: Response;
  try {
    res = await fetch(
      `/api/documents/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(versionId)}`,
    );
  } catch {
    throw new VersionFetchError(
      "You appear to be offline. Loading a version needs a connection.",
      true,
    );
  }

  if (!res.ok) {
    throw new VersionFetchError(
      res.status === 404 ? "This version no longer exists." : "Could not load this version.",
      false,
    );
  }

  const data = (await res.json()) as { content: JSONContent };
  cache.set(key, data.content);
  if (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return data.content;
}
