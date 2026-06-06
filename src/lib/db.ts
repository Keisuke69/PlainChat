import { PrismaClient } from "@prisma/client";

// 開発時のホットリロードで PrismaClient が増殖しないようグローバルに保持
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
