import { PrismaClient } from "@prisma/client";
import { env } from "../env.js";
import { createTenantIsolationExtension } from "./prisma-tenant-extension.js";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const baseClient = new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return baseClient.$extends(createTenantIsolationExtension()) as unknown as PrismaClient;
}

/** Shared Prisma client singleton with tenant isolation extension (safe for dev hot-reload). */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

export type ExtendedPrismaClient = typeof prisma;

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
