import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiResponse, HealthStatus } from "@amarok-one/types";
import { createApiResponse, createHealthStatus } from "@amarok-one/utils";
import { disconnectDatabase, verifyDatabaseConnection } from "./lib/database.js";
import { isAppError } from "./lib/errors.js";
import { prisma } from "./lib/prisma.js";
import { apiRoutes } from "./routes.js";
import { env } from "./env.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/", (context) => {
  const response: ApiResponse<{ name: string; version: string }> = createApiResponse({
    name: "AMAROK ONE API",
    version: "0.0.0",
  });

  return context.json(response);
});

app.get("/health", async (context) => {
  const databaseOk = await verifyDatabaseConnection();
  const status: HealthStatus["status"] = databaseOk ? "ok" : "down";
  const health: HealthStatus = createHealthStatus("api", status);
  const response: ApiResponse<HealthStatus & { database: "connected" | "disconnected" }> =
    createApiResponse({
      ...health,
      database: databaseOk ? "connected" : "disconnected",
    });

  return context.json(response, databaseOk ? 200 : 503);
});

app.get("/health/db", async (context) => {
  const databaseOk = await verifyDatabaseConnection();

  if (!databaseOk) {
    return context.json(
      { code: "DATABASE_UNAVAILABLE", message: "Cannot connect to PostgreSQL" },
      503,
    );
  }

  const counts = await prisma.$transaction([
    prisma.organization.count({ where: { deletedAt: null } }),
    prisma.company.count({ where: { deletedAt: null } }),
    prisma.branch.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.role.count({ where: { deletedAt: null } }),
    prisma.permission.count(),
    prisma.userRole.count({ where: { deletedAt: null } }),
    prisma.refreshToken.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.auditLog.count(),
  ]);

  const response: ApiResponse<{
    connected: true;
    counts: {
      organizations: number;
      companies: number;
      branches: number;
      users: number;
      roles: number;
      permissions: number;
      userRoles: number;
      activeRefreshTokens: number;
      auditLogs: number;
    };
  }> = createApiResponse({
    connected: true,
    counts: {
      organizations: counts[0],
      companies: counts[1],
      branches: counts[2],
      users: counts[3],
      roles: counts[4],
      permissions: counts[5],
      userRoles: counts[6],
      activeRefreshTokens: counts[7],
      auditLogs: counts[8],
    },
  });

  return context.json(response);
});

app.route("/", apiRoutes);

app.notFound((context) => {
  return context.json({ code: "NOT_FOUND", message: "Route not found" }, 404);
});

app.onError((error, context) => {
  if (isAppError(error)) {
    return context.json(
      {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
      error.status as ContentfulStatusCode,
    );
  }

  console.error(error);
  return context.json({ code: "INTERNAL_ERROR", message: "An unexpected error occurred" }, 500);
});

async function startServer(): Promise<void> {
  const databaseOk = await verifyDatabaseConnection();
  if (!databaseOk) {
    console.error("Failed to connect to PostgreSQL. Run: pnpm db:setup");
    process.exit(1);
  }

  console.log("PostgreSQL connected.");

  serve(
    {
      fetch: app.fetch,
      port: env.PORT,
      hostname: env.HOST,
    },
    (info) => {
      console.log(`AMAROK ONE API listening on http://${info.address}:${info.port}`);
    },
  );
}

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  await disconnectDatabase();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

startServer().catch(async (error: unknown) => {
  console.error("Failed to start API:", error);
  await disconnectDatabase();
  process.exit(1);
});

export { app };
