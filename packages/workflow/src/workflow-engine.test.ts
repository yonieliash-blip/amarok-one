import { describe, expect, it } from "vitest";
import { asOrganizationId, asServiceCallId, asWorkflowCommandId } from "./domain/identifiers.js";
import { WorkflowCommand } from "./domain/workflow-command.js";
import { WorkflowEngine, planWorkflowStatePath } from "./domain/workflow-engine.js";
import { applyWorkflowEvent } from "./domain/service-call.rehydration.js";
import { InMemoryWorkflowEventStore } from "./infrastructure/memory/in-memory-workflow-event-store.js";
import { WorkflowModule } from "./application/workflow-module.js";

const orgId = asOrganizationId("11111111-1111-1111-1111-111111111111");
const callId = asServiceCallId("22222222-2222-2222-2222-222222222222");

function testClock(): { now: () => string } {
  let tick = 0;
  return {
    now: () => {
      tick += 1;
      return `2026-07-28T12:00:0${tick}.000Z`;
    },
  };
}

function testIds(): {
  nextEventId: () => string;
  nextStateId: () => string;
  nextVisitId: () => string;
} {
  let n = 0;
  const next = (): string => {
    n += 1;
    return `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
  };
  return { nextEventId: next, nextStateId: next, nextVisitId: next };
}

describe("WorkflowEngine lifecycle", () => {
  it("assigns a technician and moves lifecycle to assigned", () => {
    const engine = new WorkflowEngine();
    const clock = testClock();
    const ids = testIds();
    const init = WorkflowCommand.create({
      id: asWorkflowCommandId("33333333-3333-3333-3333-333333333333"),
      organizationId: orgId,
      aggregateId: callId,
      type: "InitializeServiceCallWorkflow",
      payload: { externalServiceCallId: callId, initialLifecycleKey: "new" },
      issuedAt: "2026-07-28T12:00:00.000Z",
    });
    let { aggregate } = engine.execute(null, init, clock, ids);
    expect(aggregate.lifecycle.key).toBe("new");

    const queue = WorkflowCommand.create({
      id: asWorkflowCommandId("44444444-4444-4444-4444-444444444444"),
      organizationId: orgId,
      aggregateId: callId,
      type: "TransitionServiceCallLifecycle",
      payload: { toLifecycleKey: "waiting_assignment" },
      issuedAt: "2026-07-28T12:00:01.000Z",
    });
    ({ aggregate } = engine.execute(aggregate, queue, clock, ids));
    expect(aggregate.lifecycle.key).toBe("waiting_assignment");

    const assign = WorkflowCommand.create({
      id: asWorkflowCommandId("55555555-5555-5555-5555-555555555555"),
      organizationId: orgId,
      aggregateId: callId,
      type: "AssignTechnicianToVisit",
      payload: {
        visitId: "66666666-6666-6666-6666-666666666666",
        technicianId: "77777777-7777-7777-7777-777777777777",
      },
      issuedAt: "2026-07-28T12:00:02.000Z",
    });
    const { aggregate: assigned, events } = engine.execute(aggregate, assign, clock, ids);
    expect(assigned.lifecycle.key).toBe("assigned");
    expect(assigned.visits).toHaveLength(1);
    expect(assigned.visits[0]?.status).toBe("assigned");
    expect(events.some((event) => event.type === "visit.scheduled")).toBe(true);
    expect(events.some((event) => event.type === "service_call.lifecycle_changed")).toBe(true);
  });
});

describe("WorkflowEngine", () => {
  it("plans a multi-step workflow path", () => {
    expect(planWorkflowStatePath("draft", "in_field")).toEqual([
      "dispatching",
      "scheduled",
      "in_field",
    ]);
  });

  it("initializes a service-call workflow from a command", () => {
    const engine = new WorkflowEngine();
    const command = WorkflowCommand.create({
      id: asWorkflowCommandId("33333333-3333-3333-3333-333333333333"),
      organizationId: orgId,
      aggregateId: callId,
      type: "InitializeServiceCallWorkflow",
      payload: { externalServiceCallId: callId },
      issuedAt: "2026-07-28T12:00:00.000Z",
    });

    const { aggregate, events } = engine.execute(null, command, testClock(), testIds());

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("service_call.workflow_initialized");
    expect(aggregate.state.key).toBe("draft");
    expect(aggregate.lifecycle.key).toBe("new");
    expect(aggregate.version).toBe(1);
  });

  it("aligns workflow state in a single event when a path exists", () => {
    const engine = new WorkflowEngine();
    const clock = testClock();
    const ids = testIds();
    const init = WorkflowCommand.create({
      id: asWorkflowCommandId("33333333-3333-3333-3333-333333333333"),
      organizationId: orgId,
      aggregateId: callId,
      type: "InitializeServiceCallWorkflow",
      payload: { externalServiceCallId: callId },
      issuedAt: "2026-07-28T12:00:00.000Z",
    });
    const { aggregate: initialized } = engine.execute(null, init, clock, ids);

    const align = WorkflowCommand.create({
      id: asWorkflowCommandId("44444444-4444-4444-4444-444444444444"),
      organizationId: orgId,
      aggregateId: callId,
      type: "AlignWorkflowStateToKey",
      payload: { toStateKey: "in_field" },
      issuedAt: "2026-07-28T12:00:01.000Z",
    });

    const { aggregate, events } = engine.execute(initialized, align, clock, ids);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("service_call.state_changed");
    expect(aggregate.state.key).toBe("in_field");
  });

  it("rehydrates aggregate from events", () => {
    const engine = new WorkflowEngine();
    const clock = testClock();
    const ids = testIds();
    const init = WorkflowCommand.create({
      id: asWorkflowCommandId("33333333-3333-3333-3333-333333333333"),
      organizationId: orgId,
      aggregateId: callId,
      type: "InitializeServiceCallWorkflow",
      payload: { externalServiceCallId: callId },
      issuedAt: "2026-07-28T12:00:00.000Z",
    });
    const { events } = engine.execute(null, init, clock, ids);
    const restored = applyWorkflowEvent.rehydrate(events);
    expect(restored.externalServiceCallId).toBe(callId);
  });
});

describe("WorkflowModule", () => {
  it("persists events through the event store port", async () => {
    const store = new InMemoryWorkflowEventStore();
    const module = new WorkflowModule({ eventStore: store, clock: testClock(), ids: testIds() });

    const command = WorkflowCommand.create({
      id: asWorkflowCommandId("33333333-3333-3333-3333-333333333333"),
      organizationId: orgId,
      aggregateId: callId,
      type: "InitializeServiceCallWorkflow",
      payload: { externalServiceCallId: callId },
      issuedAt: "2026-07-28T12:00:00.000Z",
      idempotencyKey: "init-1",
    });

    const result = await module.dispatch(command);
    expect(result.events).toHaveLength(1);

    const replay = await store.loadEvents(orgId, callId);
    expect(replay).toHaveLength(1);
  });
});
