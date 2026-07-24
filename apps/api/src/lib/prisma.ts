import { PrismaClient } from "@prisma/client";
import { env } from "../env.js";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Shared Prisma client singleton (safe for dev hot-reload). */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type {
  Organization,
  User,
  Role,
  UserRole,
  Permission,
  RefreshToken,
  AuditLog,
} from "@prisma/client";
