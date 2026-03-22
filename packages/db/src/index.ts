import { PrismaClient } from "./generated/prisma";

// Singleton pattern — prevents multiple Prisma Client instances in development.
// Bun's hot reload re-imports modules on every change. Without this guard,
// each reload creates a new connection pool and exhausts the database connections.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Re-export generated types so other packages import from @aion/db, not deep paths
export * from "./generated/prisma";
