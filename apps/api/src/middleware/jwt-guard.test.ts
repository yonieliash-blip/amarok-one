import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@amarok-one/permissions";
import { AppError } from "../lib/errors.js";
import { requireAllPermissions, requireAnyPermission } from "./permission-guard.js";

function createTestApp(permissions: string[]) {
  const app = new Hono();

  app.onError((error, context) => {
    if (error instanceof AppError) {
      return context.json({ code: error.code, message: error.message }, error.status);
    }
    throw error;
  });

  app.use("*", async (context, next) => {
    context.set("auth", {
      user: {
        sub: "user-1",
        email: "user@test.com",
        organizationId: "org-1",
        organizationSlug: "demo",
        roleId: "role-1",
        roleSlug: "technician",
        roles: [{ id: "role-1", slug: "technician", name: "Technician" }],
        permissions,
        type: "access" as const,
      },
    });
    await next();
  });

  app.get(
    "/any",
    requireAnyPermission(PERMISSIONS.SERVICE_CALLS_READ, PERMISSIONS.MY_SERVICE_CALLS_READ),
    (context) => context.json({ ok: true }),
  );

  app.get(
    "/all",
    requireAllPermissions(PERMISSIONS.SERVICE_CALLS_READ, PERMISSIONS.SERVICE_CALLS_WRITE),
    (context) => context.json({ ok: true }),
  );

  return app;
}

describe("authorization guards", () => {
  it("allows access when any required permission is granted", async () => {
    const app = createTestApp([PERMISSIONS.MY_SERVICE_CALLS_READ]);
    const response = await app.request("/any");
    expect(response.status).toBe(200);
  });

  it("blocks access when no required permission is granted", async () => {
    const app = createTestApp([PERMISSIONS.CUSTOMERS_READ]);
    const response = await app.request("/any");
    expect(response.status).toBe(403);
  });

  it("requires all permissions when configured", async () => {
    const app = createTestApp([PERMISSIONS.SERVICE_CALLS_READ]);
    const response = await app.request("/all");
    expect(response.status).toBe(403);
  });
});
