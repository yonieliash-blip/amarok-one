import { prisma } from "./prisma.js";

/** Verify PostgreSQL connectivity via Prisma. */
export async function verifyDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

/** Gracefully disconnect Prisma on shutdown. */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
