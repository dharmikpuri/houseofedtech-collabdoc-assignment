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
 * Run a unit of work as the restricted `app_user` role with the caller's id in
 * scope, so Postgres row-level security enforces per-user access. The role
 * switch and `app.user_id` setting are transaction-local and reset on commit.
 */
export function withUser<T>(userId: string, fn: (tx: TxClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL ROLE app_user");
    await tx.$queryRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  });
}
