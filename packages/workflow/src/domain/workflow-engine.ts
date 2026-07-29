import type { WorkflowCommand } from "./workflow-command.js";
import type { WorkflowEvent } from "./workflow-event.js";
import { ServiceCall, isWorkflowStateKey } from "./service-call.js";
import { WorkflowDomainError } from "./domain-error.js";
import { asServiceCallId } from "./identifiers.js";
import { applyWorkflowEvent } from "./service-call.rehydration.js";
import type { WorkflowStateKey } from "./workflow-state.js";
import {
  assertServiceCallLifecycleTransition,
  isServiceCallLifecycleKey,
  type ServiceCallLifecycleKey,
} from "./service-call-lifecycle.js";
import { assertVisitOwnedByTechnician, assertVisitStatusTransition } from "./visit-lifecycle.js";

export interface WorkflowEngineResult {
  aggregate: ServiceCall;
  events: readonly WorkflowEvent[];
}

export interface WorkflowEngineClock {
  now(): string;
}

export interface WorkflowEngineIds {
  nextEventId(): string;
  nextStateId(): string;
  nextVisitId(): string;
}

const ALLOWED_STATE_TRANSITIONS: Record<WorkflowStateKey, readonly WorkflowStateKey[]> = {
  draft: ["dispatching", "cancelled"],
  dispatching: ["scheduled", "cancelled"],
  scheduled: ["in_field", "waiting", "cancelled"],
  in_field: ["waiting", "completed", "cancelled"],
  waiting: ["in_field", "completed", "cancelled"],
  completed: ["draft"],
  cancelled: ["draft"],
};

/** Shortest allowed transition path between workflow states (excludes `from` when equal to `to`). */
export function planWorkflowStatePath(
  from: WorkflowStateKey,
  to: WorkflowStateKey,
): readonly WorkflowStateKey[] {
  if (from === to) {
    return [];
  }

  const queue: WorkflowStateKey[] = [from];
  const visited = new Set<WorkflowStateKey>([from]);
  const previous = new Map<WorkflowStateKey, WorkflowStateKey>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    for (const next of ALLOWED_STATE_TRANSITIONS[current]) {
      if (visited.has(next)) {
        continue;
      }
      visited.add(next);
      previous.set(next, current);
      if (next === to) {
        const path: WorkflowStateKey[] = [];
        let step: WorkflowStateKey | undefined = to;
        while (step && step !== from) {
          path.unshift(step);
          step = previous.get(step);
        }
        return path;
      }
      queue.push(next);
    }
  }

  throw new WorkflowDomainError(
    "INVALID_STATE_TRANSITION",
    `No workflow path from '${from}' to '${to}'`,
    { from, to },
  );
}

function assertTransition(from: WorkflowStateKey, to: WorkflowStateKey): void {
  if (from === to) {
    return;
  }
  if (!ALLOWED_STATE_TRANSITIONS[from].includes(to)) {
    throw new WorkflowDomainError(
      "INVALID_STATE_TRANSITION",
      `Transition ${from} → ${to} is not allowed`,
      {
        from,
        to,
      },
    );
  }
}

function nextSequence(aggregate: ServiceCall | null): number {
  return aggregate ? aggregate.version + 1 : 1;
}

/**
 * Pure domain service: validates commands and produces events + next aggregate snapshot.
 * Persistence is handled by application/infrastructure adapters.
 */
export class WorkflowEngine {
  execute(
    aggregate: ServiceCall | null,
    command: WorkflowCommand,
    clock: WorkflowEngineClock,
    ids: WorkflowEngineIds,
  ): WorkflowEngineResult {
    if (aggregate && aggregate.id !== command.aggregateId) {
      throw new WorkflowDomainError(
        "INVALID_COMMAND",
        "Command aggregateId does not match loaded aggregate",
      );
    }
    if (aggregate && aggregate.organizationId !== command.organizationId) {
      throw new WorkflowDomainError(
        "INVALID_COMMAND",
        "Command organizationId does not match aggregate",
      );
    }

    aggregate?.assertVersion(command.expectedVersion);

    const occurredAt = clock.now();
    const correlationId = command.idempotencyKey ?? command.id;
    const baseSequence = nextSequence(aggregate);
    const events: WorkflowEvent[] = [];

    switch (command.type) {
      case "InitializeServiceCallWorkflow": {
        if (aggregate) {
          throw new WorkflowDomainError(
            "INVALID_COMMAND",
            "Workflow already initialized for this aggregate",
          );
        }
        const externalServiceCallId = command.payload.externalServiceCallId;
        if (typeof externalServiceCallId !== "string") {
          throw new WorkflowDomainError("INVALID_COMMAND", "externalServiceCallId is required");
        }
        const initialStateKey =
          typeof command.payload.initialStateKey === "string"
            ? command.payload.initialStateKey
            : "draft";
        if (!isWorkflowStateKey(initialStateKey)) {
          throw new WorkflowDomainError("INVALID_COMMAND", "Invalid initialStateKey");
        }

        events.push(
          applyWorkflowEvent.eventFromFact({
            id: ids.nextEventId(),
            organizationId: command.organizationId,
            aggregateId: command.aggregateId,
            type: "service_call.workflow_initialized",
            payload: {
              externalServiceCallId,
              initialStateKey,
              stateId: ids.nextStateId(),
              lifecycleId: ids.nextStateId(),
              initialLifecycleKey:
                typeof command.payload.initialLifecycleKey === "string"
                  ? command.payload.initialLifecycleKey
                  : "new",
            },
            occurredAt,
            actorId: command.issuerId,
            correlationId,
            causationId: command.id,
            sequence: baseSequence,
          }),
        );
        break;
      }
      case "TransitionServiceCallLifecycle": {
        if (!aggregate) {
          throw new WorkflowDomainError("INVALID_COMMAND", "Aggregate must exist");
        }
        const toLifecycleKey = command.payload.toLifecycleKey;
        if (typeof toLifecycleKey !== "string" || !isServiceCallLifecycleKey(toLifecycleKey)) {
          throw new WorkflowDomainError("INVALID_COMMAND", "toLifecycleKey is required");
        }
        assertServiceCallLifecycleTransition(aggregate.lifecycle.key, toLifecycleKey);
        events.push(
          applyWorkflowEvent.eventFromFact({
            id: ids.nextEventId(),
            organizationId: command.organizationId,
            aggregateId: command.aggregateId,
            type: "service_call.lifecycle_changed",
            payload: {
              fromLifecycleKey: aggregate.lifecycle.key,
              toLifecycleKey,
              reason: command.payload.reason,
            },
            occurredAt,
            actorId: command.issuerId,
            correlationId,
            causationId: command.id,
            sequence: baseSequence,
          }),
        );
        break;
      }
      case "CloseServiceCall": {
        if (!aggregate) {
          throw new WorkflowDomainError("INVALID_COMMAND", "Aggregate must exist");
        }
        assertServiceCallLifecycleTransition(aggregate.lifecycle.key, "closed");
        events.push(
          applyWorkflowEvent.eventFromFact({
            id: ids.nextEventId(),
            organizationId: command.organizationId,
            aggregateId: command.aggregateId,
            type: "service_call.lifecycle_changed",
            payload: {
              fromLifecycleKey: aggregate.lifecycle.key,
              toLifecycleKey: "closed",
              reason: command.payload.reason ?? "closed_by_manager",
            },
            occurredAt,
            actorId: command.issuerId,
            correlationId,
            causationId: command.id,
            sequence: baseSequence + events.length,
          }),
        );
        events.push(
          applyWorkflowEvent.eventFromFact({
            id: ids.nextEventId(),
            organizationId: command.organizationId,
            aggregateId: command.aggregateId,
            type: "service_call.closed",
            payload: {},
            occurredAt,
            actorId: command.issuerId,
            correlationId,
            causationId: command.id,
            sequence: baseSequence + events.length,
          }),
        );
        break;
      }
      case "AssignTechnicianToVisit": {
        if (!aggregate) {
          throw new WorkflowDomainError("INVALID_COMMAND", "Aggregate must exist");
        }
        const technicianId = command.payload.technicianId;
        if (typeof technicianId !== "string" || !technicianId.trim()) {
          throw new WorkflowDomainError("INVALID_COMMAND", "technicianId is required");
        }
        const sequence = Number(command.payload.sequence ?? aggregate.visits.length + 1);
        const visitId =
          typeof command.payload.visitId === "string" ? command.payload.visitId : ids.nextVisitId();
        events.push(
          applyWorkflowEvent.eventFromFact({
            id: ids.nextEventId(),
            organizationId: command.organizationId,
            aggregateId: command.aggregateId,
            type: "visit.scheduled",
            payload: {
              visitId,
              sequence,
              scheduledStart: command.payload.scheduledStart,
              scheduledEnd: command.payload.scheduledEnd,
              assignedTechnicianId: technicianId,
              notes: command.payload.notes,
              initialVisitStatus: "assigned",
            },
            occurredAt,
            actorId: command.issuerId,
            correlationId,
            causationId: command.id,
            sequence: baseSequence + events.length,
          }),
        );
        if (aggregate.lifecycle.key !== "assigned") {
          assertServiceCallLifecycleTransition(aggregate.lifecycle.key, "assigned");
          events.push(
            applyWorkflowEvent.eventFromFact({
              id: ids.nextEventId(),
              organizationId: command.organizationId,
              aggregateId: command.aggregateId,
              type: "service_call.lifecycle_changed",
              payload: {
                fromLifecycleKey: aggregate.lifecycle.key,
                toLifecycleKey: "assigned",
                reason: "technician_assigned",
              },
              occurredAt,
              actorId: command.issuerId,
              correlationId,
              causationId: command.id,
              sequence: baseSequence + events.length,
            }),
          );
        }
        break;
      }
      case "ChangeWorkflowState": {
        if (!aggregate) {
          throw new WorkflowDomainError("INVALID_COMMAND", "Aggregate must exist");
        }
        const toStateKey = command.payload.toStateKey;
        if (typeof toStateKey !== "string" || !isWorkflowStateKey(toStateKey)) {
          throw new WorkflowDomainError("INVALID_COMMAND", "toStateKey is required");
        }
        assertTransition(aggregate.state.key, toStateKey);
        events.push(
          applyWorkflowEvent.eventFromFact({
            id: ids.nextEventId(),
            organizationId: command.organizationId,
            aggregateId: command.aggregateId,
            type: "service_call.state_changed",
            payload: {
              fromStateKey: aggregate.state.key,
              toStateKey,
              reason: command.payload.reason,
            },
            occurredAt,
            actorId: command.issuerId,
            correlationId,
            causationId: command.id,
            sequence: baseSequence,
          }),
        );
        break;
      }
      case "AlignWorkflowStateToKey": {
        if (!aggregate) {
          throw new WorkflowDomainError("INVALID_COMMAND", "Aggregate must exist");
        }
        const toStateKey = command.payload.toStateKey;
        if (typeof toStateKey !== "string" || !isWorkflowStateKey(toStateKey)) {
          throw new WorkflowDomainError("INVALID_COMMAND", "toStateKey is required");
        }
        if (aggregate.state.key !== toStateKey) {
          planWorkflowStatePath(aggregate.state.key, toStateKey);
          events.push(
            applyWorkflowEvent.eventFromFact({
              id: ids.nextEventId(),
              organizationId: command.organizationId,
              aggregateId: command.aggregateId,
              type: "service_call.state_changed",
              payload: {
                fromStateKey: aggregate.state.key,
                toStateKey,
                reason: command.payload.reason,
              },
              occurredAt,
              actorId: command.issuerId,
              correlationId,
              causationId: command.id,
              sequence: baseSequence,
            }),
          );
        }
        break;
      }
      case "RecordOperationalStatusChange": {
        if (!aggregate) {
          throw new WorkflowDomainError("INVALID_COMMAND", "Aggregate must exist");
        }
        const fromStatus = command.payload.fromStatus;
        const toStatus = command.payload.toStatus;
        if (typeof fromStatus !== "string" || typeof toStatus !== "string") {
          throw new WorkflowDomainError("INVALID_COMMAND", "fromStatus and toStatus are required");
        }
        events.push(
          applyWorkflowEvent.eventFromFact({
            id: ids.nextEventId(),
            organizationId: command.organizationId,
            aggregateId: command.aggregateId,
            type: "service_call.operational_status_recorded",
            payload: { fromStatus, toStatus },
            occurredAt,
            actorId: command.issuerId,
            correlationId,
            causationId: command.id,
            sequence: baseSequence,
          }),
        );
        break;
      }
      case "ScheduleVisit": {
        if (!aggregate) {
          throw new WorkflowDomainError("INVALID_COMMAND", "Aggregate must exist");
        }
        const sequence = Number(command.payload.sequence ?? aggregate.visits.length + 1);
        events.push(
          applyWorkflowEvent.eventFromFact({
            id: ids.nextEventId(),
            organizationId: command.organizationId,
            aggregateId: command.aggregateId,
            type: "visit.scheduled",
            payload: {
              visitId: ids.nextVisitId(),
              sequence,
              scheduledStart: command.payload.scheduledStart,
              scheduledEnd: command.payload.scheduledEnd,
              assignedTechnicianId: command.payload.assignedTechnicianId,
              notes: command.payload.notes,
            },
            occurredAt,
            actorId: command.issuerId,
            correlationId,
            causationId: command.id,
            sequence: baseSequence,
          }),
        );
        break;
      }
      case "StartVisit": {
        if (!aggregate) {
          throw new WorkflowDomainError("INVALID_COMMAND", "Aggregate must exist");
        }
        const visitId = command.payload.visitId;
        if (typeof visitId !== "string") {
          throw new WorkflowDomainError("INVALID_COMMAND", "visitId is required");
        }
        const visit = aggregate.findVisit(visitId);
        if (!visit) {
          throw new WorkflowDomainError("VISIT_NOT_FOUND", "Visit not found", { visitId });
        }
        events.push(
          applyWorkflowEvent.eventFromFact({
            id: ids.nextEventId(),
            organizationId: command.organizationId,
            aggregateId: command.aggregateId,
            type: "visit.started",
            payload: { visitId },
            occurredAt,
            actorId: command.issuerId,
            correlationId,
            causationId: command.id,
            sequence: baseSequence,
          }),
        );
        break;
      }
      case "StartVisitDriving": {
        if (!aggregate) {
          throw new WorkflowDomainError("INVALID_COMMAND", "Aggregate must exist");
        }
        const visitId = command.payload.visitId;
        const technicianId = command.payload.technicianId;
        if (typeof visitId !== "string" || typeof technicianId !== "string") {
          throw new WorkflowDomainError("INVALID_COMMAND", "visitId and technicianId are required");
        }
        const visit = aggregate.findVisit(visitId);
        if (!visit) {
          throw new WorkflowDomainError("VISIT_NOT_FOUND", "Visit not found", { visitId });
        }
        assertVisitOwnedByTechnician(visit.assignedTechnicianId, technicianId);
        assertVisitStatusTransition(visit.status, "driving");
        events.push(
          applyWorkflowEvent.eventFromFact({
            id: ids.nextEventId(),
            organizationId: command.organizationId,
            aggregateId: command.aggregateId,
            type: "visit.driving_started",
            payload: { visitId },
            occurredAt,
            actorId: command.issuerId,
            correlationId,
            causationId: command.id,
            sequence: baseSequence + events.length,
          }),
        );
        if (aggregate.lifecycle.key !== "driving") {
          assertServiceCallLifecycleTransition(aggregate.lifecycle.key, "driving");
          events.push(
            applyWorkflowEvent.eventFromFact({
              id: ids.nextEventId(),
              organizationId: command.organizationId,
              aggregateId: command.aggregateId,
              type: "service_call.lifecycle_changed",
              payload: {
                fromLifecycleKey: aggregate.lifecycle.key,
                toLifecycleKey: "driving",
                reason: "technician_driving",
              },
              occurredAt,
              actorId: command.issuerId,
              correlationId,
              causationId: command.id,
              sequence: baseSequence + events.length,
            }),
          );
        }
        break;
      }
      case "StartVisitWorking": {
        if (!aggregate) {
          throw new WorkflowDomainError("INVALID_COMMAND", "Aggregate must exist");
        }
        const visitId = command.payload.visitId;
        const technicianId = command.payload.technicianId;
        if (typeof visitId !== "string" || typeof technicianId !== "string") {
          throw new WorkflowDomainError("INVALID_COMMAND", "visitId and technicianId are required");
        }
        const visit = aggregate.findVisit(visitId);
        if (!visit) {
          throw new WorkflowDomainError("VISIT_NOT_FOUND", "Visit not found", { visitId });
        }
        assertVisitOwnedByTechnician(visit.assignedTechnicianId, technicianId);
        assertVisitStatusTransition(visit.status, "working");
        events.push(
          applyWorkflowEvent.eventFromFact({
            id: ids.nextEventId(),
            organizationId: command.organizationId,
            aggregateId: command.aggregateId,
            type: "visit.working_started",
            payload: { visitId },
            occurredAt,
            actorId: command.issuerId,
            correlationId,
            causationId: command.id,
            sequence: baseSequence + events.length,
          }),
        );
        if (aggregate.lifecycle.key !== "working") {
          assertServiceCallLifecycleTransition(aggregate.lifecycle.key, "working");
          events.push(
            applyWorkflowEvent.eventFromFact({
              id: ids.nextEventId(),
              organizationId: command.organizationId,
              aggregateId: command.aggregateId,
              type: "service_call.lifecycle_changed",
              payload: {
                fromLifecycleKey: aggregate.lifecycle.key,
                toLifecycleKey: "working",
                reason: "technician_working",
              },
              occurredAt,
              actorId: command.issuerId,
              correlationId,
              causationId: command.id,
              sequence: baseSequence + events.length,
            }),
          );
        }
        break;
      }
      case "FinishVisit": {
        if (!aggregate) {
          throw new WorkflowDomainError("INVALID_COMMAND", "Aggregate must exist");
        }
        const visitId = command.payload.visitId;
        const technicianId = command.payload.technicianId;
        if (typeof visitId !== "string" || typeof technicianId !== "string") {
          throw new WorkflowDomainError("INVALID_COMMAND", "visitId and technicianId are required");
        }
        const visit = aggregate.findVisit(visitId);
        if (!visit) {
          throw new WorkflowDomainError("VISIT_NOT_FOUND", "Visit not found", { visitId });
        }
        assertVisitOwnedByTechnician(visit.assignedTechnicianId, technicianId);
        assertVisitStatusTransition(visit.status, "finished");
        const nextLifecycleRaw = command.payload.nextLifecycleKey;
        const nextLifecycle: ServiceCallLifecycleKey =
          typeof nextLifecycleRaw === "string" && isServiceCallLifecycleKey(nextLifecycleRaw)
            ? nextLifecycleRaw
            : "waiting_assignment";
        events.push(
          applyWorkflowEvent.eventFromFact({
            id: ids.nextEventId(),
            organizationId: command.organizationId,
            aggregateId: command.aggregateId,
            type: "visit.finished",
            payload: { visitId },
            occurredAt,
            actorId: command.issuerId,
            correlationId,
            causationId: command.id,
            sequence: baseSequence + events.length,
          }),
        );
        if (aggregate.lifecycle.key !== nextLifecycle) {
          assertServiceCallLifecycleTransition(aggregate.lifecycle.key, nextLifecycle);
          events.push(
            applyWorkflowEvent.eventFromFact({
              id: ids.nextEventId(),
              organizationId: command.organizationId,
              aggregateId: command.aggregateId,
              type: "service_call.lifecycle_changed",
              payload: {
                fromLifecycleKey: aggregate.lifecycle.key,
                toLifecycleKey: nextLifecycle,
                reason: "visit_finished",
              },
              occurredAt,
              actorId: command.issuerId,
              correlationId,
              causationId: command.id,
              sequence: baseSequence + events.length,
            }),
          );
        }
        break;
      }
      case "CompleteVisit":
      case "CancelVisit": {
        if (!aggregate) {
          throw new WorkflowDomainError("INVALID_COMMAND", "Aggregate must exist");
        }
        const visitId = command.payload.visitId;
        if (typeof visitId !== "string") {
          throw new WorkflowDomainError("INVALID_COMMAND", "visitId is required");
        }
        if (!aggregate.findVisit(visitId)) {
          throw new WorkflowDomainError("VISIT_NOT_FOUND", "Visit not found", { visitId });
        }
        events.push(
          applyWorkflowEvent.eventFromFact({
            id: ids.nextEventId(),
            organizationId: command.organizationId,
            aggregateId: command.aggregateId,
            type: command.type === "CompleteVisit" ? "visit.completed" : "visit.cancelled",
            payload: { visitId },
            occurredAt,
            actorId: command.issuerId,
            correlationId,
            causationId: command.id,
            sequence: baseSequence,
          }),
        );
        break;
      }
      default: {
        const _exhaustive: never = command.type;
        throw new WorkflowDomainError(
          "INVALID_COMMAND",
          `Unknown command type: ${String(_exhaustive)}`,
        );
      }
    }

    let next: ServiceCall | null = aggregate;
    for (const event of events) {
      next = applyWorkflowEvent.applyNext(next, event);
    }

    if (!next) {
      throw new WorkflowDomainError("INVARIANT_VIOLATION", "Engine did not produce an aggregate");
    }

    return { aggregate: next, events };
  }
}

export function createServiceCallAggregateId(
  serviceCallUuid: string,
): ReturnType<typeof asServiceCallId> {
  return asServiceCallId(serviceCallUuid);
}
