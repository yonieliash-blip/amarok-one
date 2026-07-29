import type { ISODateString, WorkflowAggregateType } from "./primitives.js";
import type {
  OrganizationId,
  ServiceCallId,
  WorkflowCommandId,
  WorkflowEventId,
} from "./identifiers.js";

export type WorkflowEventType =
  | "service_call.workflow_initialized"
  | "service_call.state_changed"
  | "service_call.operational_status_recorded"
  | "service_call.lifecycle_changed"
  | "service_call.closed"
  | "visit.scheduled"
  | "visit.started"
  | "visit.driving_started"
  | "visit.working_started"
  | "visit.completed"
  | "visit.finished"
  | "visit.cancelled";

export interface WorkflowEventProps {
  id: WorkflowEventId;
  organizationId: OrganizationId;
  aggregateType: WorkflowAggregateType;
  aggregateId: ServiceCallId;
  type: WorkflowEventType;
  payload: Record<string, unknown>;
  occurredAt: ISODateString;
  actorId?: string;
  correlationId: string;
  causationId?: WorkflowCommandId;
  sequence: number;
}

/** Immutable fact appended to the workflow event stream. */
export class WorkflowEvent {
  readonly id: WorkflowEventId;
  readonly organizationId: OrganizationId;
  readonly aggregateType: WorkflowAggregateType;
  readonly aggregateId: ServiceCallId;
  readonly type: WorkflowEventType;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: ISODateString;
  readonly actorId: string | undefined;
  readonly correlationId: string;
  readonly causationId: WorkflowCommandId | undefined;
  readonly sequence: number;

  private constructor(props: WorkflowEventProps) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.aggregateType = props.aggregateType;
    this.aggregateId = props.aggregateId;
    this.type = props.type;
    this.payload = Object.freeze({ ...props.payload });
    this.occurredAt = props.occurredAt;
    this.actorId = props.actorId;
    this.correlationId = props.correlationId;
    this.causationId = props.causationId;
    this.sequence = props.sequence;
  }

  static create(props: WorkflowEventProps): WorkflowEvent {
    if (props.sequence < 1) {
      throw new Error("WorkflowEvent sequence must be >= 1");
    }
    return new WorkflowEvent(props);
  }
}
