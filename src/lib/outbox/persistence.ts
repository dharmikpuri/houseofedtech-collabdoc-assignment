import type { Mutation } from "@/lib/outbox/types";

/**
 * IndexedDB persistence for the outbox.
 *
 * A tiny promise wrapper instead of a dependency: the surface needed is four
 * operations on one object store. If IndexedDB is unavailable (some private
 * browsing modes, or it errors on open), everything degrades to an in-memory
 * map — the queue still works for the lifetime of the tab, it just won't
 * survive a reload. Failing loudly here would break editing, which is worse.
 */

const DB_NAME = "collabdoc-outbox";
const DB_VERSION = 1;
const STORE = "mutations";

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, Mutation>();

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      return resolve(null);
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("userId", "userId", { unique: false });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgrading the schema must not be blocked by this one.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  return dbPromise;
}

function run<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = work(tx.objectStore(STORE));
    let result: T;
    request.onsuccess = () => {
      result = request.result;
    };
    // Resolve on commit, not on request success, so a write is durable before
    // the caller proceeds (e.g. before we send it to the server).
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? request.error);
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export async function loadMutations(userId: string): Promise<Mutation[]> {
  const db = await openDb();
  if (!db) return [...memory.values()].filter((m) => m.userId === userId);
  try {
    return await run<Mutation[]>(db, "readonly", (store) =>
      store.index("userId").getAll(IDBKeyRange.only(userId)),
    );
  } catch {
    return [...memory.values()].filter((m) => m.userId === userId);
  }
}

export async function saveMutation(mutation: Mutation): Promise<void> {
  memory.set(mutation.id, mutation);
  const db = await openDb();
  if (!db) return;
  try {
    await run(db, "readwrite", (store) => store.put(mutation));
  } catch {
    // Storage full or blocked: the in-memory copy still carries the mutation
    // for this session.
  }
}

export async function deleteMutation(id: string): Promise<void> {
  memory.delete(id);
  const db = await openDb();
  if (!db) return;
  try {
    await run(db, "readwrite", (store) => store.delete(id));
  } catch {
    // Best effort — a stale record is harmless because replays are idempotent.
  }
}
