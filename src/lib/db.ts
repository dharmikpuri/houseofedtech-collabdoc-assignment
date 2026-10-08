import { PrismaClient, type Prisma } from "@/generated/prisma";

/**
 * Single Prisma instance across hot reloads in dev. Without this, Next.js's
 * module reloading spawns a new client (and connection pool) on every edit,
 * eventually exhausting the database's connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type TxClient = Prisma.TransactionClient;

/**
 * Interactive-transaction timeouts.
 *
 * Prisma's defaults (maxWait 2s) assume a local database. Against a remote
 * Postgres — Supabase here — a burst of concurrent requests can queue for a
 * pooled connection for longer than that, and the transaction fails with
 * `P2028: Unable to start a transaction in the given time` even though nothing
 * is actually wrong. Giving the wait a realistic ceiling turns a spurious 500
 * into a slightly slower success.
 *
 * `timeout` still bounds how long a transaction may hold a connection, so a
 * genuinely stuck query cannot pin the pool indefinitely.
 */
const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const;

/**
 * Run a unit of work with the caller's id set in `app.user_id` for the
 * transaction, so the row-level-security policies can scope every row to the
 * user. The app connects as the database owner (which bypasses RLS), so the
 * policies act as a backstop behind the app-layer authz checks; pointing Prisma
 * at the restricted `app_user` role would enforce them on this path too.
 */
export function withUser<T>(userId: string, fn: (tx: TxClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  }, TX_OPTIONS);
}
