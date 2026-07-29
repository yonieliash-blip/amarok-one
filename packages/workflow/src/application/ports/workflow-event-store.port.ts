import type { OrganizationId, ServiceCallId } from "../../domain/identifiers.js";
import type { WorkflowCommand } from "../../domain/workflow-command.js";
import type { WorkflowEvent } from "../../domain/workflow-event.js";
import type { ServiceCall } from "../../domain/service-call.js";

export interface AppendWorkflowEventsInput {
  organizationId: OrganizationId;
  aggregateId: ServiceCallId;
  events: readonly WorkflowEvent[];
  expectedVersion: number | null;
}

/** Outbound port: append-only workflow event persistence. */
export interface WorkflowEventStore {
  loadEvents(organizationId: OrganizationId, aggregateId: ServiceCallId): Promise<WorkflowEvent[]>;

  appendEvents(input: AppendWorkflowEventsInput): Promise<void>;

  findByIdempotencyKey?(
    organizationId: OrganizationId,
    idempotencyKey: string,
  ): Promise<readonly WorkflowEvent[] | null>;
}

export interface WorkflowCommandBus {
  dispatch(command: WorkflowCommand): Promise<readonly WorkflowEvent[]>;
}

export interface WorkflowAggregateLoader {
  loadServiceCall(
    organizationId: OrganizationId,
    aggregateId: ServiceCallId,
  ): Promise<ServiceCall | null>;
}

export interface WorkflowModuleDependencies {
  eventStore: WorkflowEventStore;
  clock: { now(): string };
  ids: {
    nextEventId(): string;
    nextStateId(): string;
    nextVisitId(): string;
  };
}
