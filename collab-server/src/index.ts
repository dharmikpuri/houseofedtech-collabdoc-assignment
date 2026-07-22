import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { jwtVerify } from "jose";
import pg from "pg";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const port = Number(process.env.PORT ?? 1234);
const tokenSecret = new TextEncoder().encode(requireEnv("COLLAB_TOKEN_SECRET"));
const pool = new pg.Pool({ connectionString: requireEnv("DATABASE_URL") });

const server = new Server({
  port,
  extensions: [
    new Database({
      fetch: async ({ documentName }) => {
        const { rows } = await pool.query<{ state: Buffer }>(
          "SELECT state FROM document_states WHERE document_id = $1",
          [documentName],
        );
        return rows[0]?.state ?? null;
      },
      store: async ({ documentName, state }) => {
        await pool.query(
          `INSERT INTO document_states (document_id, state, updated_at)
           VALUES ($1, $2, now())
           ON CONFLICT (document_id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
          [documentName, Buffer.from(state)],
        );
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
  onListen: async () => {
    console.log(`Collab server ready on ws://localhost:${port}`);
  },
});

server.listen();
