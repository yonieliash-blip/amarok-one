#!/usr/bin/env tsx
/**
 * End-to-end lifecycle + service history verification against local API.
 * Run after db:setup: pnpm exec tsx --env-file=../../.env scripts/verify-service-call-lifecycle-e2e.ts
 */
import { prisma } from "../src/lib/prisma.js";
import { runWithoutTenantIsolation } from "../src/lib/tenant-context.js";
import { createCompositionRoot } from "../src/composition-root.js";
import { syncSeededServiceCallWorkflowLifecycle } from "../src/modules/service-calls/service-call-workflow-seed-sync.js";

const API_URL = process.env.VITE_API_URL?.trim() || "http://localhost:3000";

async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${await response.text()}`);
  }
  const payload = (await response.json()) as { data: { accessToken: string } };
  return payload.data.accessToken;
}

async function main(): Promise<void> {
  await runWithoutTenantIsolation(async () => {
    const { serviceCallService } = createCompositionRoot();
    const org = await prisma.organization.findFirstOrThrow({
      where: { slug: "demo", deletedAt: null },
      select: { id: true },
    });
    const manager = await prisma.user.findFirstOrThrow({
      where: { email: "manager@demo.amarok.one", deletedAt: null },
      select: { id: true },
    });
    const tech1 = await prisma.user.findFirstOrThrow({
      where: { email: "tech1@demo.amarok.one", deletedAt: null },
      select: { id: true },
    });

    const sc001 = await prisma.serviceCall.findFirstOrThrow({
      where: { organizationId: org.id, serviceCallNumber: "SC-001", deletedAt: null },
      select: { id: true, status: true },
    });

    console.log("=== Reset SC-001 workflow for clean E2E run ===");
    await prisma.serviceCallVisit.deleteMany({
      where: { serviceCallId: sc001.id },
    });
    await prisma.workflowEvent.deleteMany({
      where: { organizationId: org.id, aggregateId: sc001.id },
    });
    await prisma.serviceCall.update({
      where: { id: sc001.id },
      data: {
        lifecycleState: "NEW",
        status: "OPEN",
        assignedUserId: null,
        completedAt: null,
      },
    });

    const sc006 = await prisma.serviceCall.findFirstOrThrow({
      where: { organizationId: org.id, serviceCallNumber: "SC-006", deletedAt: null },
      select: { id: true, status: true },
    });

    console.log("=== Sync SC-001 ===");
    const sc001Lifecycle = await syncSeededServiceCallWorkflowLifecycle(
      serviceCallService,
      org.id,
      sc001.id,
      "open",
      manager.id,
    );
    console.log(`SC-001 lifecycle: ${sc001Lifecycle}`);

    console.log("=== Assign tech1 via API ===");
    const token = await login("manager@demo.amarok.one", "Admin@123456");
    const assignResponse = await fetch(
      `${API_URL}/organizations/${org.id}/service-calls/${sc001.id}/lifecycle/assign`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ technicianId: tech1.id }),
      },
    );
    const assignBody = await assignResponse.text();
    if (!assignResponse.ok) {
      throw new Error(`Assign failed: ${assignResponse.status} ${assignBody}`);
    }
    console.log("Assign OK");

    const techToken = await login("tech1@demo.amarok.one", "Admin@123456");
    const lifecycleAfterAssign = (await (
      await fetch(`${API_URL}/organizations/${org.id}/service-calls/${sc001.id}/lifecycle`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()) as { data: { visits: { id: string }[] } };
    const visit1Id = lifecycleAfterAssign.data.visits[0]?.id;
    if (!visit1Id) {
      throw new Error("Expected visit after assign");
    }

    for (const step of ["driving", "working"] as const) {
      const response = await fetch(
        `${API_URL}/organizations/${org.id}/service-calls/${sc001.id}/visits/${visit1Id}/${step}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${techToken}` },
        },
      );
      if (!response.ok) {
        throw new Error(`${step} failed: ${response.status} ${await response.text()}`);
      }
      console.log(`${step} OK`);
    }

    const finishResponse = await fetch(
      `${API_URL}/organizations/${org.id}/service-calls/${sc001.id}/visits/${visit1Id}/finish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${techToken}`,
        },
        body: JSON.stringify({ nextLifecycleState: "waiting_assignment" }),
      },
    );
    if (!finishResponse.ok) {
      throw new Error(`finish failed: ${finishResponse.status} ${await finishResponse.text()}`);
    }
    console.log("finish visit 1 OK");

    const assign2Response = await fetch(
      `${API_URL}/organizations/${org.id}/service-calls/${sc001.id}/lifecycle/assign`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ technicianId: tech1.id }),
      },
    );
    if (!assign2Response.ok) {
      throw new Error(
        `second assign failed: ${assign2Response.status} ${await assign2Response.text()}`,
      );
    }
    console.log("second assign OK");

    const lifecycleAfterAssign2 = (await (
      await fetch(`${API_URL}/organizations/${org.id}/service-calls/${sc001.id}/lifecycle`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()) as { data: { visits: { id: string }[] } };
    const visit2Id = lifecycleAfterAssign2.data.visits.find((visit) => visit.id !== visit1Id)?.id;
    if (!visit2Id) {
      throw new Error("Expected second visit after reassign");
    }

    for (const step of ["driving", "working"] as const) {
      const response = await fetch(
        `${API_URL}/organizations/${org.id}/service-calls/${sc001.id}/visits/${visit2Id}/${step}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${techToken}` },
        },
      );
      if (!response.ok) {
        throw new Error(`${step} visit 2 failed: ${response.status} ${await response.text()}`);
      }
      console.log(`${step} visit 2 OK`);
    }

    const finish2Response = await fetch(
      `${API_URL}/organizations/${org.id}/service-calls/${sc001.id}/visits/${visit2Id}/finish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${techToken}`,
        },
        body: JSON.stringify({ nextLifecycleState: "waiting_assignment" }),
      },
    );
    if (!finish2Response.ok) {
      throw new Error(
        `finish visit 2 failed: ${finish2Response.status} ${await finish2Response.text()}`,
      );
    }
    console.log("finish visit 2 OK");

    const closeResponse = await fetch(
      `${API_URL}/organizations/${org.id}/service-calls/${sc001.id}/lifecycle/close`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: "e2e verification" }),
      },
    );
    if (!closeResponse.ok) {
      throw new Error(`close failed: ${closeResponse.status} ${await closeResponse.text()}`);
    }
    console.log("close OK");

    const finalLifecycle = await serviceCallService.getServiceCallLifecycle(org.id, sc001.id);
    console.log("=== SC-001 final lifecycle ===");
    console.log(`state=${finalLifecycle.lifecycleState} visits=${finalLifecycle.visits.length}`);
    console.log(`timeline types=${finalLifecycle.timeline.map((event) => event.type).join(", ")}`);

    const timelineTypes = finalLifecycle.timeline.map((event) => event.type);
    const requiredTimelineEvents = [
      "service_call.workflow_initialized",
      "service_call.lifecycle_changed",
      "visit.scheduled",
      "visit.driving_started",
      "visit.working_started",
      "visit.finished",
      "service_call.closed",
    ];
    for (const eventType of requiredTimelineEvents) {
      if (!timelineTypes.includes(eventType)) {
        throw new Error(`Expected timeline event ${eventType}, got: ${timelineTypes.join(", ")}`);
      }
    }

    if (finalLifecycle.visits.length < 2) {
      throw new Error(`Expected at least 2 visits, got ${finalLifecycle.visits.length}`);
    }

    const sc006Lifecycle = await syncSeededServiceCallWorkflowLifecycle(
      serviceCallService,
      org.id,
      sc006.id,
      "cancelled",
      manager.id,
    );
    console.log(`SC-006 lifecycle: ${sc006Lifecycle}`);

    const assigneesResponse = await fetch(
      `${API_URL}/organizations/${org.id}/service-calls/assignees`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const assignees = (await assigneesResponse.json()) as {
      data: { displayName: string; email: string }[];
    };
    console.log("=== Assignees ===");
    for (const member of assignees.data) {
      console.log(`${member.displayName} <${member.email}>`);
    }

    if (assignees.data.length !== 1 || assignees.data[0]?.email !== "tech1@demo.amarok.one") {
      throw new Error(`Expected single demo technician assignee, got ${assignees.data.length}`);
    }

    if (finalLifecycle.lifecycleState !== "closed") {
      throw new Error(`Expected SC-001 closed, got ${finalLifecycle.lifecycleState}`);
    }

    console.log("E2E lifecycle verification passed.");
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
