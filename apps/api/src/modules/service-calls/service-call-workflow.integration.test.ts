import { describe, expect, it } from "vitest";
import type { ServiceCall } from "@amarok-one/types";
import {
  InMemoryWorkflowEventStore,
  applyWorkflowEvent,
  asOrganizationId,
  asServiceCallId,
} from "@amarok-one/workflow";
import { ServiceCallWorkflowIntegration } from "./service-call-workflow.integration.js";

const orgId = "11111111-1111-1111-1111-111111111111";
const callId = "22222222-2222-2222-2222-222222222222";

function baseServiceCall(overrides: Partial<ServiceCall> = {}): ServiceCall {
  return {
    id: callId,
    organizationId: orgId,
    serviceCallNumber: "SC-100",
    title: "Hydraulic leak",
    status: "open",
    lifecycleState: "waiting_assignment",
    priority: "normal",
    openedAt: "2026-07-28T10:00:00.000Z",
    customerId: "44444444-4444-4444-4444-444444444444",
    equipmentId: "55555555-5555-5555-5555-555555555555",
    createdAt: "2026-07-28T10:00:00.000Z",
    updatedAt: "2026-07-28T10:00:00.000Z",
    ...overrides,
  };
}

function createIntegration() {
  const eventStore = new InMemoryWorkflowEventStore();
  let tick = 0;
  const clock = {
    now: () => {
      tick += 1;
      return `2026-07-28T12:00:0${tick}.000Z`;
    },
  };
  let n = 0;
  const ids = {
    nextEventId: () => {
      n += 1;
      return `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
    },
    nextStateId: () => {
      n += 1;
      return `00000000-0000-0000-0001-${String(n).padStart(12, "0")}`;
    },
    nextVisitId: () => {
      n += 1;
      return `00000000-0000-0000-0002-${String(n).padStart(12, "0")}`;
    },
  };
  const integration = new ServiceCallWorkflowIntegration({
    eventStore,
    clock,
    ids,
  });
  return { integration, eventStore };
}

describe("ServiceCallWorkflowIntegration", () => {
  it("initializes workflow on create", async () => {
    const { integration, eventStore } = createIntegration();
    await integration.syncAfterCreate(baseServiceCall(), "actor-1");

    const events = await eventStore.loadEvents(asOrganizationId(orgId), asServiceCallId(callId));
    expect(events.some((event) => event.type === "service_call.workflow_initialized")).toBe(true);
  });

  it("does not mutate lifecycle on metadata update sync", async () => {
    const { integration, eventStore } = createIntegration();
    const created = baseServiceCall({ assignedUserId: undefined, status: "open" });
    await integration.syncAfterCreate(created, "actor-1");

    const inProgress = baseServiceCall({
      assignedUserId: "33333333-3333-3333-3333-333333333333",
      status: "in_progress",
      updatedAt: "2026-07-28T11:00:00.000Z",
    });
    await integration.syncAfterUpdate(created, inProgress, "actor-1");

    const events = await eventStore.loadEvents(asOrganizationId(orgId), asServiceCallId(callId));
    const types = events.map((event) => event.type);
    expect(types).not.toContain("visit.scheduled");
    expect(types).not.toContain("service_call.operational_status_recorded");
    expect(types).not.toContain("visit.started");

    const aggregate = applyWorkflowEvent.rehydrate(events);
    expect(aggregate.lifecycle.key).toBe("new");
    expect(aggregate.visits).toHaveLength(0);
  });
});
