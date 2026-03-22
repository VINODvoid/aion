import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma v7 uses driver adapters for database connections.
// PrismaPg wraps the pg driver and passes it to PrismaClient.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Singleton pattern — prevents multiple connection pools during hot reload
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Re-export generated types so other packages import from @aion/db, not deep paths
export * from "./generated/prisma/client";
