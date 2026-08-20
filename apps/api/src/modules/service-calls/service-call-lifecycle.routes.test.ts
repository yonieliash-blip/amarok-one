import { PERMISSIONS } from "@amarok-one/permissions";
import type { ServiceCallLifecycleView, TechnicianCurrentTask } from "@amarok-one/types";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../lib/errors.js";
import type { AccessTokenPayload } from "../../lib/jwt.js";
import { createServiceCallRoutes } from "./service-call.routes.js";
import type { ServiceCallService } from "./service-call.service.js";

vi.mock("../../env.js", () => ({
  env: {
    JWT_SECRET: "test-access-secret-that-is-at-least-32-characters",
    JWT_REFRESH_SECRET: "test-refresh-secret-that-is-at-least-32-characters",
    JWT_ACCESS_TTL: "15m",
    JWT_REFRESH_TTL: "7d",
  },
}));

const organizationId = "11111111-1111-4111-8111-111111111111";
const otherOrganizationId = "22222222-2222-4222-8222-222222222222";
const serviceCallId = "33333333-3333-4333-8333-333333333333";
const visitId = "66666666-6666-4666-8666-666666666666";

const lifecycleView: ServiceCallLifecycleView = {
  serviceCallId,
  lifecycleState: "assigned",
  availableTransitions: ["driving", "waiting_assignment", "waiting_manager_closure"],
  visits: [],
  timeline: [],
};

const currentTask = {
  serviceCall: { id: serviceCallId, title: "Hydraulic leak", serviceCallNumber: "SC-100" },
  visit: { id: visitId, status: "working" },
} as TechnicianCurrentTask;

function createTestApp(input: {
  permissions: string[];
  tokenOrganizationId?: string;
  assertAssignedServiceCallAccess?: ReturnType<typeof vi.fn>;
}) {
  const getServiceCallLifecycle = vi.fn().mockResolvedValue(lifecycleView);
  const assertAssignedServiceCallAccess =
    input.assertAssignedServiceCallAccess ?? vi.fn().mockResolvedValue(undefined);
  const startVisitWorking = vi.fn().mockResolvedValue(lifecycleView);
  const finishVisit = vi.fn().mockResolvedValue(lifecycleView);
  const getTechnicianCurrentTask = vi.fn().mockResolvedValue(currentTask);
  const service = {
    getServiceCallLifecycle,
    assertAssignedServiceCallAccess,
    startVisitWorking,
    finishVisit,
    getTechnicianCurrentTask,
  } as unknown as ServiceCallService;

  const user: AccessTokenPayload = {
    sub: "44444444-4444-4444-8444-444444444444",
    email: "reader@example.com",
    organizationId: input.tokenOrganizationId ?? organizationId,
    organizationSlug: "demo",
    roleId: "55555555-5555-4555-8555-555555555555",
    roleSlug: "service-manager",
    roles: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        slug: "service-manager",
        name: "Service Manager",
      },
    ],
    permissions: input.permissions,
    type: "access",
  };

  const app = new Hono();
  app.onError((error, context) => {
    if (error instanceof AppError) {
      return context.json({ code: error.code, message: error.message }, error.status);
    }
    throw error;
  });
  app.use("*", async (context, next) => {
    context.set("auth", { user });
    await next();
  });
  app.route("/organizations/:organizationId/service-calls", createServiceCallRoutes(service));

  return {
    app,
    getServiceCallLifecycle,
    assertAssignedServiceCallAccess,
    startVisitWorking,
    finishVisit,
    getTechnicianCurrentTask,
    user,
  };
}

describe("technician current task route", () => {
  it("returns the actor's active visit in one response", async () => {
    const { app, getTechnicianCurrentTask, user } = createTestApp({
      permissions: [PERMISSIONS.MY_SERVICE_CALLS_READ],
    });

    const response = await app.request(
      `/organizations/${organizationId}/service-calls/current-task`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { serviceCall: { id: serviceCallId }, visit: { id: visitId } },
    });
    expect(getTechnicianCurrentTask).toHaveBeenCalledWith(organizationId, user.sub);
  });

  it("denies users without assigned-call or service-call read access", async () => {
    const { app, getTechnicianCurrentTask } = createTestApp({
      permissions: [PERMISSIONS.CUSTOMERS_READ],
    });

    const response = await app.request(
      `/organizations/${organizationId}/service-calls/current-task`,
    );

    expect(response.status).toBe(403);
    expect(getTechnicianCurrentTask).not.toHaveBeenCalled();
  });
});

function lifecycleUrl(targetOrganizationId = organizationId): string {
  return `/organizations/${targetOrganizationId}/service-calls/${serviceCallId}/lifecycle`;
}

describe("service call activity timeline route authorization", () => {
  it("allows a tenant service-call reader to load lifecycle history", async () => {
    const { app, getServiceCallLifecycle } = createTestApp({
      permissions: [PERMISSIONS.SERVICE_CALLS_READ],
    });

    const response = await app.request(lifecycleUrl());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { availableTransitions: lifecycleView.availableTransitions },
    });
    expect(getServiceCallLifecycle).toHaveBeenCalledWith(organizationId, serviceCallId);
  });

  it("denies users without service-call read access", async () => {
    const { app, getServiceCallLifecycle } = createTestApp({
      permissions: [PERMISSIONS.CUSTOMERS_READ],
    });

    const response = await app.request(lifecycleUrl());

    expect(response.status).toBe(403);
    expect(getServiceCallLifecycle).not.toHaveBeenCalled();
  });

  it("denies cross-tenant lifecycle history access", async () => {
    const { app, getServiceCallLifecycle } = createTestApp({
      permissions: [PERMISSIONS.SERVICE_CALLS_READ],
    });

    const response = await app.request(lifecycleUrl(otherOrganizationId));

    expect(response.status).toBe(403);
    expect(getServiceCallLifecycle).not.toHaveBeenCalled();
  });

  it("checks assigned-call access before returning history to a technician", async () => {
    const assertAssignedServiceCallAccess = vi
      .fn()
      .mockRejectedValue(new AppError("FORBIDDEN", "Insufficient permissions", 403));
    const { app, getServiceCallLifecycle, user } = createTestApp({
      permissions: [PERMISSIONS.MY_SERVICE_CALLS_READ, PERMISSIONS.MY_SERVICE_CALLS_WRITE],
      assertAssignedServiceCallAccess,
    });

    const response = await app.request(lifecycleUrl());

    expect(response.status).toBe(403);
    expect(assertAssignedServiceCallAccess).toHaveBeenCalledWith(
      organizationId,
      serviceCallId,
      user.sub,
    );
    expect(getServiceCallLifecycle).not.toHaveBeenCalled();
  });
});

describe("technician visit workflow route authorization", () => {
  function visitUrl(action: "working" | "finish", targetOrganizationId = organizationId): string {
    return `/organizations/${targetOrganizationId}/service-calls/${serviceCallId}/visits/${visitId}/${action}`;
  }

  it("allows an assigned technician with write access to start work", async () => {
    const { app, assertAssignedServiceCallAccess, startVisitWorking, user } = createTestApp({
      permissions: [PERMISSIONS.MY_SERVICE_CALLS_READ, PERMISSIONS.MY_SERVICE_CALLS_WRITE],
    });

    const response = await app.request(visitUrl("working"), { method: "POST" });

    expect(response.status).toBe(200);
    expect(assertAssignedServiceCallAccess).toHaveBeenCalledWith(
      organizationId,
      serviceCallId,
      user.sub,
    );
    expect(startVisitWorking).toHaveBeenCalledWith(
      organizationId,
      serviceCallId,
      visitId,
      user.sub,
    );
  });

  it("finishes the assigned visit into waiting for manager closure", async () => {
    const { app, finishVisit, user } = createTestApp({
      permissions: [PERMISSIONS.MY_SERVICE_CALLS_READ, PERMISSIONS.MY_SERVICE_CALLS_WRITE],
    });

    const response = await app.request(visitUrl("finish"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nextLifecycleState: "waiting_manager_closure" }),
    });

    expect(response.status).toBe(200);
    expect(finishVisit).toHaveBeenCalledWith(
      organizationId,
      serviceCallId,
      visitId,
      { nextLifecycleState: "waiting_manager_closure" },
      user.sub,
    );
  });

  it("denies visit mutations to assigned-call read-only access", async () => {
    const { app, assertAssignedServiceCallAccess, startVisitWorking } = createTestApp({
      permissions: [PERMISSIONS.MY_SERVICE_CALLS_READ],
    });

    const response = await app.request(visitUrl("working"), { method: "POST" });

    expect(response.status).toBe(403);
    expect(assertAssignedServiceCallAccess).not.toHaveBeenCalled();
    expect(startVisitWorking).not.toHaveBeenCalled();
  });

  it("denies cross-tenant visit mutations before assignment lookup", async () => {
    const { app, assertAssignedServiceCallAccess, startVisitWorking } = createTestApp({
      permissions: [PERMISSIONS.MY_SERVICE_CALLS_READ, PERMISSIONS.MY_SERVICE_CALLS_WRITE],
    });

    const response = await app.request(visitUrl("working", otherOrganizationId), {
      method: "POST",
    });

    expect(response.status).toBe(403);
    expect(assertAssignedServiceCallAccess).not.toHaveBeenCalled();
    expect(startVisitWorking).not.toHaveBeenCalled();
  });

  it("does not mutate a visit when assignment authorization fails", async () => {
    const assertAssignedServiceCallAccess = vi
      .fn()
      .mockRejectedValue(new AppError("FORBIDDEN", "Insufficient permissions", 403));
    const { app, startVisitWorking } = createTestApp({
      permissions: [PERMISSIONS.MY_SERVICE_CALLS_READ, PERMISSIONS.MY_SERVICE_CALLS_WRITE],
      assertAssignedServiceCallAccess,
    });

    const response = await app.request(visitUrl("working"), { method: "POST" });

    expect(response.status).toBe(403);
    expect(startVisitWorking).not.toHaveBeenCalled();
  });
});
