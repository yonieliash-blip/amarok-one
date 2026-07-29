import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ServiceCall } from "@amarok-one/types";
import { WorkflowDomainError } from "@amarok-one/workflow";
import { isAppError } from "../../lib/errors.js";
import { createServiceCallService } from "./service-call.service.js";
import type { ServiceCallWorkflowPort } from "./service-call-workflow.port.js";

const organizationId = "11111111-1111-1111-1111-111111111111";
const serviceCallId = "22222222-2222-2222-2222-222222222222";

const baseDto: ServiceCall = {
  id: serviceCallId,
  organizationId,
  serviceCallNumber: "SC-1",
  title: "Test",
  status: "open",
  lifecycleState: "waiting_assignment",
  priority: "normal",
  openedAt: "2026-07-29T08:00:00.000Z",
  customerId: "33333333-3333-3333-3333-333333333333",
  equipmentId: "44444444-4444-4444-4444-444444444444",
  createdAt: "2026-07-29T08:00:00.000Z",
  updatedAt: "2026-07-29T08:00:00.000Z",
};

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn(),
    serviceCall: {
      findFirst: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
    },
    equipment: {
      findFirst: vi.fn(),
    },
    branch: {
      findFirst: vi.fn(),
    },
    userRole: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../organizations/organization.service.js", () => ({
  assertOrganizationExists: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./service-call-relationship.js", () => ({
  assertEquipmentMatchesCustomer: vi.fn(),
}));

vi.mock("../../lib/audit.js", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./service-call-workflow-projection.js", () => ({
  projectServiceCallFromWorkflow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./service-call-lifecycle.service.js", () => ({
  createServiceCallLifecycleService: vi.fn(() => ({
    enqueueAfterCreate: vi.fn().mockResolvedValue(undefined),
    getServiceCallLifecycle: vi.fn(),
    assignTechnician: vi.fn(),
    transitionLifecycle: vi.fn(),
    closeServiceCall: vi.fn(),
    startVisitDriving: vi.fn(),
    startVisitWorking: vi.fn(),
    finishVisit: vi.fn(),
    assertVisitOwnedByTechnician: vi.fn(),
  })),
}));

const testServiceDeps = (workflow: ServiceCallWorkflowPort) => ({
  workflow,
  clock: { now: (): string => "2026-07-29T08:00:00.000Z" },
  ids: {
    nextEventId: (): string => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    nextStateId: (): string => "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    nextVisitId: (): string => "cccccccc-cccc-cccc-cccc-cccccccccccc",
  },
});

const { prisma } = await import("../../lib/prisma.js");
const { assertEquipmentMatchesCustomer } = await import("./service-call-relationship.js");

function mockServiceCallRow() {
  return {
    id: serviceCallId,
    organizationId,
    serviceCallNumber: "SC-1",
    title: "Test",
    status: "OPEN",
    lifecycleState: "NEW",
    priority: "NORMAL",
    openedAt: new Date(),
    scheduledAt: null,
    completedAt: null,
    customerId: baseDto.customerId,
    equipmentId: baseDto.equipmentId,
    branchId: null,
    assignedUserId: null,
    contactName: null,
    contactPhone: null,
    location: null,
    notes: null,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    customer: {
      id: baseDto.customerId,
      name: "Customer",
      customerNumber: "C-1",
    },
    equipment: {
      id: baseDto.equipmentId,
      name: "Forklift",
      internalNumber: "E-1",
      manufacturer: "Acme",
      model: "X1",
    },
    branch: null,
    assignedUser: null,
  };
}

function mockValidationQueries(): void {
  vi.mocked(prisma.customer.findFirst).mockResolvedValue({ id: baseDto.customerId } as never);
  vi.mocked(prisma.equipment.findFirst).mockResolvedValue({
    id: baseDto.equipmentId,
    customerId: baseDto.customerId,
  } as never);
}

describe("createServiceCallService production hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not invoke workflow reconciliation on GET", async () => {
    const workflow: ServiceCallWorkflowPort = {
      reconcileServiceCallWorkflow: vi.fn(),
      syncAfterCreate: vi.fn(),
      syncAfterUpdate: vi.fn(),
    };

    vi.mocked(prisma.serviceCall.findFirst).mockResolvedValue(mockServiceCallRow() as never);

    const service = createServiceCallService(testServiceDeps(workflow));
    await service.getServiceCallById(organizationId, serviceCallId);

    expect(workflow.reconcileServiceCallWorkflow).not.toHaveBeenCalled();
    expect(workflow.syncAfterCreate).not.toHaveBeenCalled();
    expect(workflow.syncAfterUpdate).not.toHaveBeenCalled();
  });

  it("runs workflow sync inside the prisma transaction on create", async () => {
    const workflow: ServiceCallWorkflowPort = {
      reconcileServiceCallWorkflow: vi.fn(),
      syncAfterCreate: vi.fn().mockResolvedValue(undefined),
      syncAfterUpdate: vi.fn(),
    };

    vi.mocked(assertEquipmentMatchesCustomer).mockImplementation(() => undefined);
    mockValidationQueries();

    const txCreate = vi.fn().mockResolvedValue(mockServiceCallRow());

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback({
        serviceCall: { create: txCreate },
      } as never);
    });

    const service = createServiceCallService(testServiceDeps(workflow));
    await service.createServiceCall(
      organizationId,
      {
        serviceCallNumber: "SC-NEW",
        title: "New",
        customerId: baseDto.customerId,
        equipmentId: baseDto.equipmentId,
      },
      "actor-1",
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(workflow.syncAfterCreate).toHaveBeenCalledTimes(1);
    const syncContext = vi.mocked(workflow.syncAfterCreate).mock.calls[0]?.[2];
    expect(syncContext?.eventStore).toBeDefined();
  });

  it("returns mapped application errors and aborts the transaction when workflow sync fails on create", async () => {
    const workflow: ServiceCallWorkflowPort = {
      reconcileServiceCallWorkflow: vi.fn(),
      syncAfterCreate: vi
        .fn()
        .mockRejectedValue(new WorkflowDomainError("INVARIANT_VIOLATION", "workflow failed")),
      syncAfterUpdate: vi.fn(),
    };

    vi.mocked(assertEquipmentMatchesCustomer).mockImplementation(() => undefined);
    mockValidationQueries();

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback({
        serviceCall: {
          create: vi.fn().mockResolvedValue({
            ...mockServiceCallRow(),
            serviceCallNumber: "SC-NEW",
            title: "New",
          }),
        },
      } as never);
    });

    const service = createServiceCallService(testServiceDeps(workflow));

    await expect(
      service.createServiceCall(organizationId, {
        serviceCallNumber: "SC-NEW",
        title: "New",
        customerId: baseDto.customerId,
        equipmentId: baseDto.equipmentId,
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
      message: "workflow failed",
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("returns mapped application errors and aborts the transaction when workflow sync fails on update", async () => {
    const workflow: ServiceCallWorkflowPort = {
      reconcileServiceCallWorkflow: vi.fn(),
      syncAfterCreate: vi.fn(),
      syncAfterUpdate: vi
        .fn()
        .mockRejectedValue(
          new WorkflowDomainError("INVARIANT_VIOLATION", "update workflow failed"),
        ),
    };

    vi.mocked(prisma.serviceCall.findFirst).mockResolvedValue(mockServiceCallRow() as never);

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback({
        serviceCall: {
          update: vi.fn().mockResolvedValue(mockServiceCallRow()),
        },
      } as never);
    });

    const service = createServiceCallService(testServiceDeps(workflow));

    await expect(
      service.updateServiceCall(organizationId, serviceCallId, { title: "Updated title" }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
      message: "update workflow failed",
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(workflow.syncAfterUpdate).toHaveBeenCalledTimes(1);
  });

  it("wraps reconcile in a transaction and maps workflow failures", async () => {
    const workflow: ServiceCallWorkflowPort = {
      reconcileServiceCallWorkflow: vi
        .fn()
        .mockRejectedValue(new WorkflowDomainError("AGGREGATE_VERSION_CONFLICT", "conflict")),
      syncAfterCreate: vi.fn(),
      syncAfterUpdate: vi.fn(),
    };

    vi.mocked(prisma.serviceCall.findFirst).mockResolvedValue(mockServiceCallRow() as never);

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback({} as never));

    const service = createServiceCallService(testServiceDeps(workflow));

    await expect(
      service.reconcileServiceCallWorkflow(organizationId, serviceCallId),
    ).rejects.toSatisfy((error: unknown) => isAppError(error) && error.status === 409);
  });
});
