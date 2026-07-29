import { describe, expect, it } from "vitest";
import {
  WorkflowCommand,
  WorkflowDomainError,
  WorkflowModule,
  applyWorkflowEvent,
  asOrganizationId,
  asServiceCallId,
  asWorkflowCommandId,
  InMemoryWorkflowEventStore,
} from "@amarok-one/workflow";
import {
  PERMISSIONS,
  canAssignServiceCalls,
  canCloseServiceCalls,
  getDefaultRolePermissions,
} from "@amarok-one/permissions";
import {
  assertControlCenterPatchHasNoLifecycleFields,
  assertTechnicianPatchAllowed,
} from "./service-call-update-policy.js";

const orgId = asOrganizationId("11111111-1111-1111-1111-111111111111");
const callId = asServiceCallId("22222222-2222-2222-2222-222222222222");
const techId = "33333333-3333-3333-3333-333333333333";
const visitId = "66666666-6666-6666-6666-666666666666";

function harness() {
  const store = new InMemoryWorkflowEventStore();
  let tick = 0;
  const clock = {
    now: () => {
      tick += 1;
      return `2026-07-29T10:00:0${String(tick).padStart(2, "0")}.000Z`;
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
  const module = new WorkflowModule({ eventStore: store, clock, ids });

  async function dispatch(type: WorkflowCommand["type"], payload: Record<string, unknown>) {
    await module.dispatch(
      WorkflowCommand.create({
        id: asWorkflowCommandId(crypto.randomUUID()),
        organizationId: orgId,
        aggregateId: callId,
        type,
        payload,
        issuedAt: clock.now(),
        issuerId: techId,
      }),
    );
  }

  return { store, dispatch };
}

describe("Service call lifecycle flow (workflow engine)", () => {
  it("runs assign → driving → working → finish → dispatcher queue → close", async () => {
    const { store, dispatch } = harness();

    await dispatch("InitializeServiceCallWorkflow", {
      externalServiceCallId: callId,
      initialLifecycleKey: "new",
    });
    await dispatch("TransitionServiceCallLifecycle", {
      toLifecycleKey: "waiting_assignment",
    });
    await dispatch("AssignTechnicianToVisit", {
      visitId,
      technicianId: techId,
      sequence: 1,
    });
    await dispatch("StartVisitDriving", { visitId, technicianId: techId });
    await dispatch("StartVisitWorking", { visitId, technicianId: techId });
    await dispatch("FinishVisit", {
      visitId,
      technicianId: techId,
      nextLifecycleKey: "waiting_assignment",
    });
    await dispatch("CloseServiceCall", { reason: "manager_review_complete" });

    const events = await store.loadEvents(orgId, callId);
    const aggregate = applyWorkflowEvent.rehydrate(events);

    expect(aggregate.lifecycle.key).toBe("closed");
    expect(aggregate.visits).toHaveLength(1);
    expect(aggregate.visits[0]?.status).toBe("finished");
    expect(events.some((event) => event.type === "visit.driving_started")).toBe(true);
    expect(events.some((event) => event.type === "service_call.closed")).toBe(true);
  });

  it("rejects invalid lifecycle transition", async () => {
    const { dispatch } = harness();
    await dispatch("InitializeServiceCallWorkflow", {
      externalServiceCallId: callId,
      initialLifecycleKey: "new",
    });

    await expect(
      dispatch("TransitionServiceCallLifecycle", { toLifecycleKey: "working" }),
    ).rejects.toBeInstanceOf(WorkflowDomainError);
  });

  it("rejects visit driving when technician does not own visit", async () => {
    const { dispatch } = harness();
    await dispatch("InitializeServiceCallWorkflow", {
      externalServiceCallId: callId,
      initialLifecycleKey: "new",
    });
    await dispatch("TransitionServiceCallLifecycle", {
      toLifecycleKey: "waiting_assignment",
    });
    await dispatch("AssignTechnicianToVisit", {
      visitId,
      technicianId: techId,
      sequence: 1,
    });

    await expect(
      dispatch("StartVisitDriving", {
        visitId,
        technicianId: "99999999-9999-9999-9999-999999999999",
      }),
    ).rejects.toBeInstanceOf(WorkflowDomainError);
  });
});

describe("Service call RBAC helpers", () => {
  it("grants assign/close only to service manager defaults", () => {
    const manager = getDefaultRolePermissions("service-manager");
    const coordinator = getDefaultRolePermissions("service-coordinator");
    const technician = getDefaultRolePermissions("technician");

    expect(canAssignServiceCalls(manager)).toBe(true);
    expect(canCloseServiceCalls(manager)).toBe(true);
    expect(canAssignServiceCalls(coordinator)).toBe(false);
    expect(canCloseServiceCalls(coordinator)).toBe(false);
    expect(canAssignServiceCalls(technician)).toBe(false);
    expect(technician).toContain(PERMISSIONS.MY_SERVICE_CALLS_WRITE);
    expect(technician).not.toContain(PERMISSIONS.SERVICE_CALLS_WRITE);
  });
});

describe("Service call PATCH policy", () => {
  it("blocks lifecycle fields on control-center patch", () => {
    expect(() => assertControlCenterPatchHasNoLifecycleFields({ status: "completed" })).toThrow();
  });

  it("allows technician field notes only", () => {
    expect(() => assertTechnicianPatchAllowed({ notes: "Fixed leak" })).not.toThrow();
    expect(() => assertTechnicianPatchAllowed({ status: "completed" })).toThrow();
  });
});
