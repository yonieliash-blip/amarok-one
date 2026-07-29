import {
  applyWorkflowEvent,
  asOrganizationId,
  asServiceCallId,
  type VisitStatus,
} from "@amarok-one/workflow";
import type { Prisma, ServiceCallVisitStatus } from "@prisma/client";
import { fromServiceCallStatusDto } from "../../lib/mappers.js";
import { PrismaWorkflowEventStore } from "../../infrastructure/workflow/prisma-workflow-event-store.js";
import {
  fromServiceCallLifecycleStateDto,
  fromServiceCallVisitStatusDto,
} from "./service-call-lifecycle-mappers.js";
import { legacyStatusForLifecycle } from "./service-call-lifecycle-status.js";
import type { ServiceCallLifecycleState } from "@amarok-one/types";

type Tx = Prisma.TransactionClient;

const TERMINAL_VISIT_STATUSES: readonly VisitStatus[] = ["finished", "cancelled", "completed"];

function isActiveVisitStatus(status: VisitStatus): boolean {
  return !TERMINAL_VISIT_STATUSES.includes(status);
}

/** Highest-sequence visit that is still active (current field work). */
export function selectCurrentActiveVisit(
  visits: ReadonlyArray<{
    id: string;
    sequence: number;
    status: VisitStatus;
    assignedTechnicianId?: string;
  }>,
):
  | {
      id: string;
      sequence: number;
      status: VisitStatus;
      assignedTechnicianId?: string;
    }
  | undefined {
  let selected:
    | {
        id: string;
        sequence: number;
        status: VisitStatus;
        assignedTechnicianId?: string;
      }
    | undefined;

  for (const visit of visits) {
    if (!isActiveVisitStatus(visit.status)) {
      continue;
    }
    if (!selected || visit.sequence > selected.sequence) {
      selected = visit;
    }
  }

  return selected;
}

function mapVisitStatusToPrisma(status: VisitStatus): ServiceCallVisitStatus {
  return fromServiceCallVisitStatusDto(
    status as Parameters<typeof fromServiceCallVisitStatusDto>[0],
  );
}

/**
 * Projects workflow aggregate state onto service_calls + service_call_visits.
 * Single write path for operational visit rows after workflow mutations.
 */
export async function projectServiceCallFromWorkflow(
  tx: Tx,
  organizationId: string,
  serviceCallId: string,
): Promise<void> {
  const store = new PrismaWorkflowEventStore(tx);
  const org = asOrganizationId(organizationId);
  const aggregateId = asServiceCallId(serviceCallId);
  const events = await store.loadEvents(org, aggregateId);
  if (events.length === 0) {
    return;
  }

  const aggregate = applyWorkflowEvent.rehydrate(events);
  const lifecycleKey = aggregate.lifecycle.key as ServiceCallLifecycleState;

  for (const visit of aggregate.visits) {
    const technicianId = visit.assignedTechnicianId;
    if (!technicianId) {
      continue;
    }

    await tx.serviceCallVisit.upsert({
      where: { id: visit.id },
      create: {
        id: visit.id,
        organizationId,
        serviceCallId,
        technicianId,
        sequence: visit.sequence,
        status: mapVisitStatusToPrisma(visit.status),
        scheduledStart: visit.scheduledStart ? new Date(visit.scheduledStart) : undefined,
        scheduledEnd: visit.scheduledEnd ? new Date(visit.scheduledEnd) : undefined,
        notes: visit.notes,
        drivingStartedAt: visit.status === "driving" ? new Date(visit.updatedAt) : undefined,
        workingStartedAt: visit.status === "working" ? new Date(visit.updatedAt) : undefined,
        finishedAt: TERMINAL_VISIT_STATUSES.includes(visit.status)
          ? new Date(visit.updatedAt)
          : undefined,
      },
      update: {
        technicianId,
        sequence: visit.sequence,
        status: mapVisitStatusToPrisma(visit.status),
        scheduledStart: visit.scheduledStart ? new Date(visit.scheduledStart) : undefined,
        scheduledEnd: visit.scheduledEnd ? new Date(visit.scheduledEnd) : undefined,
        notes: visit.notes,
        ...(visit.status === "driving" ? { drivingStartedAt: new Date(visit.updatedAt) } : {}),
        ...(visit.status === "working" ? { workingStartedAt: new Date(visit.updatedAt) } : {}),
        ...(TERMINAL_VISIT_STATUSES.includes(visit.status)
          ? { finishedAt: new Date(visit.updatedAt) }
          : {}),
      },
    });
  }

  const currentVisit = selectCurrentActiveVisit(
    aggregate.visits.map((visit) => ({
      id: visit.id,
      sequence: visit.sequence,
      status: visit.status,
      assignedTechnicianId: visit.assignedTechnicianId,
    })),
  );

  const serviceCallUpdate: Prisma.ServiceCallUpdateInput = {
    lifecycleState: fromServiceCallLifecycleStateDto(lifecycleKey),
    status: fromServiceCallStatusDto(legacyStatusForLifecycle(lifecycleKey)),
  };

  if (lifecycleKey === "closed") {
    serviceCallUpdate.completedAt = new Date();
  }

  if (currentVisit?.assignedTechnicianId) {
    serviceCallUpdate.assignedUser = { connect: { id: currentVisit.assignedTechnicianId } };
  } else if (lifecycleKey === "waiting_assignment" || lifecycleKey === "closed") {
    serviceCallUpdate.assignedUser = { disconnect: true };
  }

  await tx.serviceCall.update({
    where: { id: serviceCallId },
    data: serviceCallUpdate,
  });
}
