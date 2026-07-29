import type { ISODateString } from "./primitives.js";
import {
  asOrganizationId,
  asServiceCallId,
  asVisitId,
  asWorkflowEventId,
  asWorkflowStateId,
} from "./identifiers.js";
import { WorkflowDomainError } from "./domain-error.js";
import { isWorkflowStateKey, ServiceCall } from "./service-call.js";
import { Visit } from "./visit.js";
import { WorkflowEvent, type WorkflowEventType } from "./workflow-event.js";
import { WorkflowState } from "./workflow-state.js";
import { ServiceCallLifecycle, isServiceCallLifecycleKey } from "./service-call-lifecycle.js";

function requireString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new WorkflowDomainError("INVALID_COMMAND", `Missing or invalid payload field: ${key}`, {
      key,
    });
  }
  return value;
}

function applySingleEvent(aggregate: ServiceCall | null, event: WorkflowEvent): ServiceCall {
  switch (event.type) {
    case "service_call.workflow_initialized": {
      const externalId = requireString(event.payload, "externalServiceCallId");
      const stateKey = requireString(event.payload, "initialStateKey");
      if (!isWorkflowStateKey(stateKey)) {
        throw new WorkflowDomainError("INVARIANT_VIOLATION", "Invalid initialStateKey in event");
      }
      const stateId = asWorkflowStateId(requireString(event.payload, "stateId"));
      const lifecycleKeyRaw =
        typeof event.payload.initialLifecycleKey === "string"
          ? event.payload.initialLifecycleKey
          : "new";
      if (!isServiceCallLifecycleKey(lifecycleKeyRaw)) {
        throw new WorkflowDomainError(
          "INVARIANT_VIOLATION",
          "Invalid initialLifecycleKey in event",
        );
      }
      const lifecycleId = asWorkflowStateId(
        typeof event.payload.lifecycleId === "string" ? event.payload.lifecycleId : stateId,
      );
      const now = event.occurredAt;

      return ServiceCall.create({
        id: event.aggregateId,
        organizationId: event.organizationId,
        externalServiceCallId: asServiceCallId(externalId),
        state: WorkflowState.create({
          id: stateId,
          serviceCallId: event.aggregateId,
          key: stateKey,
          enteredAt: now,
        }),
        lifecycle: ServiceCallLifecycle.create({
          id: lifecycleId,
          serviceCallId: event.aggregateId,
          key: lifecycleKeyRaw,
          enteredAt: now,
        }),
        visits: [],
        version: event.sequence,
        createdAt: now,
        updatedAt: now,
      });
    }
    case "service_call.lifecycle_changed": {
      if (!aggregate) {
        throw new WorkflowDomainError(
          "INVARIANT_VIOLATION",
          "Cannot change lifecycle before initialization",
        );
      }
      const nextKey = requireString(event.payload, "toLifecycleKey");
      if (!isServiceCallLifecycleKey(nextKey)) {
        throw new WorkflowDomainError("INVARIANT_VIOLATION", "Invalid toLifecycleKey in event");
      }
      const reason = typeof event.payload.reason === "string" ? event.payload.reason : undefined;
      return aggregate.withPatch({
        lifecycle: aggregate.lifecycle.withKey(nextKey, event.occurredAt, reason),
        version: event.sequence,
        updatedAt: event.occurredAt,
      });
    }
    case "service_call.state_changed": {
      if (!aggregate) {
        throw new WorkflowDomainError(
          "INVARIANT_VIOLATION",
          "Cannot change state before initialization",
        );
      }
      const nextKey = requireString(event.payload, "toStateKey");
      if (!isWorkflowStateKey(nextKey)) {
        throw new WorkflowDomainError("INVARIANT_VIOLATION", "Invalid toStateKey in event");
      }
      const reason = typeof event.payload.reason === "string" ? event.payload.reason : undefined;

      return aggregate.withPatch({
        state: aggregate.state.withKey(nextKey, event.occurredAt, reason),
        version: event.sequence,
        updatedAt: event.occurredAt,
      });
    }
    case "service_call.operational_status_recorded": {
      if (!aggregate) {
        throw new WorkflowDomainError(
          "INVARIANT_VIOLATION",
          "Cannot record operational status before initialization",
        );
      }
      return aggregate.withPatch({
        version: event.sequence,
        updatedAt: event.occurredAt,
      });
    }
    case "service_call.closed": {
      if (!aggregate) {
        throw new WorkflowDomainError(
          "INVARIANT_VIOLATION",
          "Cannot close service call before initialization",
        );
      }
      return aggregate.withPatch({
        version: event.sequence,
        updatedAt: event.occurredAt,
      });
    }
    case "visit.scheduled": {
      if (!aggregate) {
        throw new WorkflowDomainError(
          "INVARIANT_VIOLATION",
          "Cannot schedule visit before initialization",
        );
      }
      const visit = Visit.create({
        id: asVisitId(requireString(event.payload, "visitId")),
        organizationId: aggregate.organizationId,
        serviceCallId: aggregate.id,
        sequence: Number(event.payload.sequence),
        status:
          typeof event.payload.initialVisitStatus === "string"
            ? (event.payload.initialVisitStatus as Visit["status"])
            : event.payload.assignedTechnicianId
              ? "assigned"
              : "planned",
        scheduledStart:
          typeof event.payload.scheduledStart === "string"
            ? event.payload.scheduledStart
            : undefined,
        scheduledEnd:
          typeof event.payload.scheduledEnd === "string" ? event.payload.scheduledEnd : undefined,
        assignedTechnicianId:
          typeof event.payload.assignedTechnicianId === "string"
            ? event.payload.assignedTechnicianId
            : undefined,
        notes: typeof event.payload.notes === "string" ? event.payload.notes : undefined,
        createdAt: event.occurredAt,
        updatedAt: event.occurredAt,
      });
      return aggregate.withPatch({
        visits: [...aggregate.visits, visit],
        version: event.sequence,
        updatedAt: event.occurredAt,
      });
    }
    case "visit.started":
    case "visit.driving_started":
    case "visit.working_started":
    case "visit.completed":
    case "visit.finished":
    case "visit.cancelled": {
      if (!aggregate) {
        throw new WorkflowDomainError(
          "INVARIANT_VIOLATION",
          "Cannot update visit before initialization",
        );
      }
      const visitId = requireString(event.payload, "visitId");
      const nextStatus =
        event.type === "visit.started"
          ? "in_progress"
          : event.type === "visit.driving_started"
            ? "driving"
            : event.type === "visit.working_started"
              ? "working"
              : event.type === "visit.completed"
                ? "completed"
                : event.type === "visit.finished"
                  ? "finished"
                  : "cancelled";

      const visits = aggregate.visits.map((visit) => {
        if (visit.id !== visitId) {
          return visit;
        }
        return visit.withStatus(nextStatus, event.occurredAt);
      });

      if (!visits.some((visit) => visit.id === visitId)) {
        throw new WorkflowDomainError("VISIT_NOT_FOUND", "Visit not found on aggregate", {
          visitId,
        });
      }

      return aggregate.withPatch({
        visits,
        version: event.sequence,
        updatedAt: event.occurredAt,
      });
    }
    default: {
      const _exhaustive: never = event.type;
      throw new WorkflowDomainError(
        "INVARIANT_VIOLATION",
        `Unhandled event type: ${String(_exhaustive)}`,
      );
    }
  }
}

export const applyWorkflowEvent = {
  rehydrate(events: readonly WorkflowEvent[]): ServiceCall {
    if (events.length === 0) {
      throw new WorkflowDomainError(
        "INVARIANT_VIOLATION",
        "Cannot rehydrate from empty event stream",
      );
    }

    const sorted = [...events].sort((a, b) => a.sequence - b.sequence);
    let aggregate: ServiceCall | null = null;

    for (const event of sorted) {
      aggregate = applySingleEvent(aggregate, event);
    }

    if (!aggregate) {
      throw new WorkflowDomainError(
        "INVARIANT_VIOLATION",
        "Event stream did not produce an aggregate",
      );
    }

    return aggregate;
  },

  applyNext(aggregate: ServiceCall | null, event: WorkflowEvent): ServiceCall {
    return applySingleEvent(aggregate, event);
  },

  eventFromFact(input: {
    id: string;
    organizationId: string;
    aggregateId: string;
    type: WorkflowEventType;
    payload: Record<string, unknown>;
    occurredAt: ISODateString;
    actorId?: string;
    correlationId: string;
    causationId?: string;
    sequence: number;
  }): WorkflowEvent {
    return WorkflowEvent.create({
      id: asWorkflowEventId(input.id),
      organizationId: asOrganizationId(input.organizationId),
      aggregateType: "service_call",
      aggregateId: asServiceCallId(input.aggregateId),
      type: input.type,
      payload: input.payload,
      occurredAt: input.occurredAt,
      actorId: input.actorId,
      correlationId: input.correlationId,
      causationId: input.causationId
        ? (input.causationId as WorkflowEvent["causationId"])
        : undefined,
      sequence: input.sequence,
    });
  },
};
