import { PrismaClient } from "@prisma/client"

/**
 * Prisma Client Singleton
 * 
 * Prevents multiple instances of PrismaClient in development
 * which can cause connection pool exhaustion.
 * 
 * In production, Next.js handles this automatically, but this
 * ensures consistency across all environments.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

