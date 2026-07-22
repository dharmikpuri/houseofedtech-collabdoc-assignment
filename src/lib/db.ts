import { PrismaClient } from "@/generated/prisma";

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
