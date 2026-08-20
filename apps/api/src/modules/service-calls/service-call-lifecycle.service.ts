import type {
  ServiceCallLifecycleState,
  ServiceCallLifecycleView,
  ServiceCallVisit,
} from "@amarok-one/types";
import {
  WorkflowCommand,
  WorkflowModule,
  asOrganizationId,
  asServiceCallId,
  asWorkflowCommandId,
  getAllowedServiceCallLifecycleTransitions,
  isServiceCallLifecycleKey,
} from "@amarok-one/workflow";
import type { Prisma } from "@prisma/client";
import { writeAuditLog } from "../../lib/audit.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";
import { activeOnly } from "../../lib/mappers.js";
import { mapWorkflowError } from "../../lib/workflow-errors.js";
import { prisma } from "../../lib/prisma.js";
import {
  PrismaWorkflowEventStore,
  createWorkflowClock,
  createWorkflowRuntimeIds,
} from "../../infrastructure/workflow/prisma-workflow-event-store.js";
import {
  fromServiceCallVisitStatusDto,
  toServiceCallLifecycleStateDto,
  toServiceCallVisitStatusDto,
} from "./service-call-lifecycle-mappers.js";
import type {
  AssignTechnicianInput,
  FinishVisitInput,
  TransitionLifecycleInput,
} from "./service-call-lifecycle.schemas.js";
import { projectServiceCallFromWorkflow } from "./service-call-workflow-projection.js";

export interface ServiceCallLifecycleServiceDeps {
  clock: ReturnType<typeof createWorkflowClock>;
  ids: ReturnType<typeof createWorkflowRuntimeIds>;
}

type Tx = Prisma.TransactionClient;

function visitInclude() {
  return {
    technician: { select: { id: true, email: true, displayName: true } },
  } as const;
}

export function toVisitDto(
  row: Prisma.ServiceCallVisitGetPayload<{ include: ReturnType<typeof visitInclude> }>,
): ServiceCallVisit {
  return {
    id: row.id,
    organizationId: row.organizationId,
    serviceCallId: row.serviceCallId,
    technicianId: row.technicianId,
    technician: {
      id: row.technician.id,
      email: row.technician.email,
      displayName: row.technician.displayName,
    },
    sequence: row.sequence,
    status: toServiceCallVisitStatusDto(row.status),
    scheduledStart: row.scheduledStart?.toISOString(),
    scheduledEnd: row.scheduledEnd?.toISOString(),
    drivingStartedAt: row.drivingStartedAt?.toISOString(),
    workingStartedAt: row.workingStartedAt?.toISOString(),
    finishedAt: row.finishedAt?.toISOString(),
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function lifecycleFromTimeline(
  rows: { type: string; payload: unknown }[],
  fallback: ServiceCallLifecycleState,
): ServiceCallLifecycleState {
  let latest: ServiceCallLifecycleState | null = null;
  for (const row of rows) {
    if (row.type === "service_call.workflow_initialized") {
      const payload = row.payload as Record<string, unknown>;
      const key =
        typeof payload.initialLifecycleKey === "string" ? payload.initialLifecycleKey : "new";
      if (isServiceCallLifecycleKey(key)) {
        latest = key;
      }
    }
    if (row.type === "service_call.lifecycle_changed") {
      const payload = row.payload as Record<string, unknown>;
      const key = payload.toLifecycleKey;
      if (typeof key === "string" && isServiceCallLifecycleKey(key)) {
        latest = key;
      }
    }
  }
  return latest ?? fallback;
}

export function createServiceCallLifecycleService(deps: ServiceCallLifecycleServiceDeps) {
  function workflowModuleFor(store: PrismaWorkflowEventStore): WorkflowModule {
    return new WorkflowModule({
      eventStore: store,
      clock: deps.clock,
      ids: deps.ids,
    });
  }

  async function assertServiceCallExists(organizationId: string, serviceCallId: string) {
    const row = await prisma.serviceCall.findFirst({
      where: { id: serviceCallId, organizationId, ...activeOnly },
      select: { id: true, lifecycleState: true },
    });
    if (!row) {
      throw notFound("ServiceCall", serviceCallId);
    }
    return row;
  }

  async function assertAssignableUser(organizationId: string, userId: string): Promise<void> {
    const membership = await prisma.userRole.findFirst({
      where: {
        organizationId,
        userId,
        deletedAt: null,
        user: { deletedAt: null, isActive: true },
      },
      select: { id: true },
    });
    if (!membership) {
      throw badRequest("Assigned user is not an active member of this organization", {
        assignedUserId: userId,
      });
    }
  }

  async function dispatchAndProject(
    tx: Tx,
    organizationId: string,
    serviceCallId: string,
    type: WorkflowCommand["type"],
    payload: Record<string, unknown>,
    actorId: string | undefined,
    idempotencyKey: string,
  ): Promise<void> {
    await dispatchCommand(
      tx,
      organizationId,
      serviceCallId,
      type,
      payload,
      actorId,
      idempotencyKey,
    );
    await projectServiceCallFromWorkflow(tx, organizationId, serviceCallId);
  }

  async function dispatchCommand(
    tx: Tx,
    organizationId: string,
    serviceCallId: string,
    type: WorkflowCommand["type"],
    payload: Record<string, unknown>,
    actorId: string | undefined,
    idempotencyKey: string,
  ): Promise<readonly import("@amarok-one/workflow").WorkflowEvent[]> {
    const store = new PrismaWorkflowEventStore(tx);
    const module = workflowModuleFor(store);
    const result = await module.dispatch(
      WorkflowCommand.create({
        id: asWorkflowCommandId(crypto.randomUUID()),
        organizationId: asOrganizationId(organizationId),
        aggregateId: asServiceCallId(serviceCallId),
        type,
        payload,
        issuedAt: deps.clock.now(),
        issuerId: actorId,
        idempotencyKey,
      }),
    );
    return result.events;
  }

  async function enqueueAfterCreate(
    tx: Tx,
    organizationId: string,
    serviceCallId: string,
    actorId?: string,
  ): Promise<void> {
    await dispatchAndProject(
      tx,
      organizationId,
      serviceCallId,
      "TransitionServiceCallLifecycle",
      { toLifecycleKey: "waiting_assignment", reason: "created" },
      actorId,
      `lifecycle:queue:${serviceCallId}`,
    );
  }

  async function getServiceCallLifecycle(
    organizationId: string,
    serviceCallId: string,
  ): Promise<ServiceCallLifecycleView> {
    await assertServiceCallExists(organizationId, serviceCallId);

    const [visits, events, serviceCallRow] = await Promise.all([
      prisma.serviceCallVisit.findMany({
        where: { organizationId, serviceCallId, ...activeOnly },
        include: visitInclude(),
        orderBy: [{ sequence: "asc" }],
      }),
      prisma.workflowEvent.findMany({
        where: { organizationId, aggregateId: serviceCallId },
        orderBy: { sequence: "asc" },
      }),
      prisma.serviceCall.findFirstOrThrow({
        where: { id: serviceCallId, organizationId },
        select: { lifecycleState: true },
      }),
    ]);

    const lifecycleState = lifecycleFromTimeline(
      events,
      toServiceCallLifecycleStateDto(serviceCallRow.lifecycleState),
    );

    return {
      serviceCallId,
      lifecycleState,
      availableTransitions: [...getAllowedServiceCallLifecycleTransitions(lifecycleState)],
      visits: visits.map(toVisitDto),
      timeline: events.map((row) => ({
        id: row.id,
        type: row.type,
        sequence: row.sequence,
        occurredAt: row.occurredAt.toISOString(),
        actorId: row.actorId ?? undefined,
        payload: row.payload as Record<string, unknown>,
      })),
    };
  }

  async function assignTechnician(
    organizationId: string,
    serviceCallId: string,
    input: AssignTechnicianInput,
    actorId: string,
  ): Promise<ServiceCallLifecycleView> {
    await assertServiceCallExists(organizationId, serviceCallId);
    await assertAssignableUser(organizationId, input.technicianId);

    const visitId = crypto.randomUUID();

    try {
      await prisma.$transaction(async (tx) => {
        const maxSequence = await tx.serviceCallVisit.aggregate({
          where: { serviceCallId },
          _max: { sequence: true },
        });
        const sequence = input.sequence ?? (maxSequence._max.sequence ?? 0) + 1;

        await dispatchAndProject(
          tx,
          organizationId,
          serviceCallId,
          "AssignTechnicianToVisit",
          {
            visitId,
            technicianId: input.technicianId,
            sequence,
            scheduledStart: input.scheduledStart,
            scheduledEnd: input.scheduledEnd,
            notes: input.notes,
          },
          actorId,
          `lifecycle:assign:${serviceCallId}:${visitId}`,
        );
      });

      await writeAuditLog({
        organizationId,
        actorId,
        action: "service_call.technician_assigned",
        entityType: "ServiceCall",
        entityId: serviceCallId,
        metadata: { visitId, technicianId: input.technicianId },
      });

      return getServiceCallLifecycle(organizationId, serviceCallId);
    } catch (error) {
      throw mapWorkflowError(error);
    }
  }

  async function transitionLifecycle(
    organizationId: string,
    serviceCallId: string,
    input: TransitionLifecycleInput,
    actorId: string,
  ): Promise<ServiceCallLifecycleView> {
    await assertServiceCallExists(organizationId, serviceCallId);

    try {
      await prisma.$transaction(async (tx) => {
        await dispatchAndProject(
          tx,
          organizationId,
          serviceCallId,
          "TransitionServiceCallLifecycle",
          { toLifecycleKey: input.toLifecycleState, reason: input.reason },
          actorId,
          `lifecycle:transition:${serviceCallId}:${input.toLifecycleState}`,
        );
      });

      return getServiceCallLifecycle(organizationId, serviceCallId);
    } catch (error) {
      throw mapWorkflowError(error);
    }
  }

  async function closeServiceCall(
    organizationId: string,
    serviceCallId: string,
    actorId: string,
    reason?: string,
  ): Promise<ServiceCallLifecycleView> {
    await assertServiceCallExists(organizationId, serviceCallId);

    try {
      await prisma.$transaction(async (tx) => {
        await dispatchAndProject(
          tx,
          organizationId,
          serviceCallId,
          "CloseServiceCall",
          { reason },
          actorId,
          `lifecycle:close:${serviceCallId}`,
        );
      });

      await writeAuditLog({
        organizationId,
        actorId,
        action: "service_call.closed",
        entityType: "ServiceCall",
        entityId: serviceCallId,
      });

      return getServiceCallLifecycle(organizationId, serviceCallId);
    } catch (error) {
      throw mapWorkflowError(error);
    }
  }

  async function assertVisitOwnedByTechnician(
    organizationId: string,
    serviceCallId: string,
    visitId: string,
    technicianId: string,
  ) {
    const visit = await prisma.serviceCallVisit.findFirst({
      where: { id: visitId, organizationId, serviceCallId, ...activeOnly },
      select: { technicianId: true, status: true },
    });
    if (!visit) {
      throw notFound("ServiceCallVisit", visitId);
    }
    if (visit.technicianId !== technicianId) {
      throw forbidden("Insufficient permissions");
    }
    return visit;
  }

  async function startVisitDriving(
    organizationId: string,
    serviceCallId: string,
    visitId: string,
    actorId: string,
  ): Promise<ServiceCallLifecycleView> {
    await assertVisitOwnedByTechnician(organizationId, serviceCallId, visitId, actorId);

    try {
      await prisma.$transaction(async (tx) => {
        await dispatchAndProject(
          tx,
          organizationId,
          serviceCallId,
          "StartVisitDriving",
          { visitId, technicianId: actorId },
          actorId,
          `lifecycle:visit:driving:${visitId}`,
        );
      });

      return getServiceCallLifecycle(organizationId, serviceCallId);
    } catch (error) {
      throw mapWorkflowError(error);
    }
  }

  async function startVisitWorking(
    organizationId: string,
    serviceCallId: string,
    visitId: string,
    actorId: string,
  ): Promise<ServiceCallLifecycleView> {
    await assertVisitOwnedByTechnician(organizationId, serviceCallId, visitId, actorId);

    try {
      await prisma.$transaction(async (tx) => {
        await dispatchAndProject(
          tx,
          organizationId,
          serviceCallId,
          "StartVisitWorking",
          { visitId, technicianId: actorId },
          actorId,
          `lifecycle:visit:working:${visitId}`,
        );
      });

      return getServiceCallLifecycle(organizationId, serviceCallId);
    } catch (error) {
      throw mapWorkflowError(error);
    }
  }

  async function finishVisit(
    organizationId: string,
    serviceCallId: string,
    visitId: string,
    input: FinishVisitInput,
    actorId: string,
  ): Promise<ServiceCallLifecycleView> {
    await assertVisitOwnedByTechnician(organizationId, serviceCallId, visitId, actorId);

    const otherActiveVisits = await prisma.serviceCallVisit.count({
      where: {
        organizationId,
        serviceCallId,
        deletedAt: null,
        id: { not: visitId },
        status: {
          in: [
            fromServiceCallVisitStatusDto("assigned"),
            fromServiceCallVisitStatusDto("driving"),
            fromServiceCallVisitStatusDto("working"),
            fromServiceCallVisitStatusDto("planned"),
            fromServiceCallVisitStatusDto("in_progress"),
          ],
        },
      },
    });

    let nextLifecycle: ServiceCallLifecycleState = input.nextLifecycleState ?? "waiting_assignment";
    if (otherActiveVisits > 0) {
      nextLifecycle = "assigned";
    }

    try {
      await prisma.$transaction(async (tx) => {
        await dispatchAndProject(
          tx,
          organizationId,
          serviceCallId,
          "FinishVisit",
          {
            visitId,
            technicianId: actorId,
            nextLifecycleKey: nextLifecycle,
          },
          actorId,
          `lifecycle:visit:finish:${visitId}`,
        );
      });

      return getServiceCallLifecycle(organizationId, serviceCallId);
    } catch (error) {
      throw mapWorkflowError(error);
    }
  }

  return {
    enqueueAfterCreate,
    getServiceCallLifecycle,
    assignTechnician,
    transitionLifecycle,
    closeServiceCall,
    startVisitDriving,
    startVisitWorking,
    finishVisit,
    assertVisitOwnedByTechnician,
    projectFromWorkflow: projectServiceCallFromWorkflow,
  };
}

export type ServiceCallLifecycleService = ReturnType<typeof createServiceCallLifecycleService>;
