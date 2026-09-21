import { PrismaClient } from "@prisma/client";

// Prevent multiple instances in development hot-reload
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

// Lazy proxy: Delays instantiation until the first query is actually executed at runtime.
// This prevents build-time crashes during Next.js route data collection when DATABASE_URL is not yet connected.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrismaClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
