import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Server, type Connection } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { jwtVerify } from "jose";
import pg from "pg";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function numberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const port = Number(process.env.PORT ?? 1234);
const tokenSecret = new TextEncoder().encode(requireEnv("COLLAB_TOKEN_SECRET"));
const pool = new pg.Pool({ connectionString: requireEnv("DATABASE_URL") });

// ── Size limits (OOM protection for the real-time path) ──────────────────────
//
// The REST API caps request bodies; these are the WebSocket equivalents.
//  - MAX_MESSAGE_BYTES: the `ws` library rejects any single frame larger than
//    this *before* buffering it, so one hostile message can't exhaust memory.
//  - MAX_DOCUMENT_BYTES: once a document's encoded CRDT state passes this, the
//    server stops accepting writes to it (reads and presence keep working) and
//    tells connected clients, who keep further edits locally. It re-opens
//    automatically if the document shrinks back under 90% of the limit.

const MAX_MESSAGE_BYTES = numberEnv("COLLAB_MAX_MESSAGE_BYTES", 4 * 1024 * 1024);
const MAX_DOCUMENT_BYTES = numberEnv("COLLAB_MAX_DOCUMENT_BYTES", 8 * 1024 * 1024);

const oversized = new Set<string>();
/** Connections we made read-only for size (never viewers, who are read-only by role). */
const limitedBySize = new WeakSet<Connection>();

function trackSize(
  documentName: string,
  bytes: number,
  broadcast?: (payload: string) => void,
) {
  if (bytes > MAX_DOCUMENT_BYTES && !oversized.has(documentName)) {
    oversized.add(documentName);
    console.warn(
      JSON.stringify({ level: "warn", message: "document size limit reached", documentName, bytes }),
    );
    broadcast?.(JSON.stringify({ type: "document-too-large", limitBytes: MAX_DOCUMENT_BYTES }));
  } else if (bytes < MAX_DOCUMENT_BYTES * 0.9 && oversized.has(documentName)) {
    oversized.delete(documentName);
    broadcast?.(JSON.stringify({ type: "document-size-ok" }));
  }
}

// ── Keep-alive ───────────────────────────────────────────────────────────────
//
// A free Supabase project pauses after a week without database activity. This
// process runs around the clock, so it writes a heartbeat row on start and
// every 12 hours — a backup for the app's daily cron (api/cron/heartbeat).

const HEARTBEAT_INTERVAL_MS = 12 * 60 * 60 * 1000;

async function beat() {
  try {
    await pool.query(
      `INSERT INTO heartbeats (source, beat_at, beats) VALUES ('collab-server', now(), 1)
       ON CONFLICT (source) DO UPDATE SET beat_at = now(), beats = heartbeats.beats + 1`,
    );
  } catch (error) {
    console.warn(
      JSON.stringify({ level: "warn", message: "heartbeat write failed", error: String(error) }),
    );
  }
}

const server = new Server({
  port,
  websocketOptions: { maxPayload: MAX_MESSAGE_BYTES },
  extensions: [
    new Database({
      fetch: async ({ documentName }) => {
        const { rows } = await pool.query<{ state: Buffer }>(
          "SELECT state FROM document_states WHERE document_id = $1",
          [documentName],
        );
        const state = rows[0]?.state ?? null;
        if (state) trackSize(documentName, state.byteLength);
        return state;
      },
      store: async ({ documentName, state, document }) => {
        await pool.query(
          `INSERT INTO document_states (document_id, state, updated_at)
           VALUES ($1, $2, now())
           ON CONFLICT (document_id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
          [documentName, Buffer.from(state)],
        );
        // The stored state is the fully merged document, so its length is the
        // document's real size.
        trackSize(documentName, state.byteLength, (payload) => document.broadcastStateless(payload));
      },
    }),
  ],
  // Defining onAuthenticate makes a valid token mandatory to connect.
  onAuthenticate: async ({ token, documentName, connectionConfig }) => {
    const { payload } = await jwtVerify(token, tokenSecret);
    if (payload.documentId !== documentName) {
      throw new Error("Token is not valid for this document");
    }
    // Viewers may read and receive live updates, but the server drops their writes.
    if (payload.role === "VIEWER") {
      connectionConfig.readOnly = true;
    }
    return { user: { id: payload.sub, role: payload.role } };
  },
  // Applies the document size limit per connection. Marking a connection
  // read-only is the same mechanism used for viewers: the server keeps serving
  // reads and presence but ignores writes.
  beforeHandleMessage: async ({ documentName, connection }) => {
    if (oversized.has(documentName)) {
      if (!connection.readOnly) {
        connection.readOnly = true;
        limitedBySize.add(connection);
        connection.sendStateless(
          JSON.stringify({ type: "document-too-large", limitBytes: MAX_DOCUMENT_BYTES }),
        );
      }
    } else if (limitedBySize.has(connection)) {
      connection.readOnly = false;
      limitedBySize.delete(connection);
    }
  },
  // Liveness probe for the host (e.g. Railway health checks).
  onRequest: ({ request, response, instance }) => {
    if (request.url?.split("?")[0] !== "/health") return Promise.resolve();
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(
      JSON.stringify({
        status: "ok",
        documents: instance.getDocumentsCount(),
        connections: instance.getConnectionsCount(),
      }),
    );
    // Rejecting tells Hocuspocus the request is handled; nothing else runs.
    return Promise.reject();
  },
  onListen: async () => {
    console.log(`Collab server ready on ws://localhost:${port}`);
    void beat();
    setInterval(() => void beat(), HEARTBEAT_INTERVAL_MS).unref();
  },
});

server.listen();
