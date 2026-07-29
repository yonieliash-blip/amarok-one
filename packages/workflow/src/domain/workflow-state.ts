import type { ISODateString } from "./primitives.js";
import type { WorkflowStateId, ServiceCallId } from "./identifiers.js";

/** Named position of a service-call workflow in a definition (not the legacy API status enum). */
export type WorkflowStateKey =
  "draft" | "dispatching" | "scheduled" | "in_field" | "waiting" | "completed" | "cancelled";

export interface WorkflowStateProps {
  id: WorkflowStateId;
  serviceCallId: ServiceCallId;
  key: WorkflowStateKey;
  enteredAt: ISODateString;
  reason?: string;
}

/**
 * Current workflow phase for a service call aggregate.
 * Immutable value object — transitions replace the whole state on the aggregate.
 */
export class WorkflowState {
  readonly id: WorkflowStateId;
  readonly serviceCallId: ServiceCallId;
  readonly key: WorkflowStateKey;
  readonly enteredAt: ISODateString;
  readonly reason: string | undefined;

  private constructor(props: WorkflowStateProps) {
    this.id = props.id;
    this.serviceCallId = props.serviceCallId;
    this.key = props.key;
    this.enteredAt = props.enteredAt;
    this.reason = props.reason;
  }

  static create(props: WorkflowStateProps): WorkflowState {
    return new WorkflowState(props);
  }

  withKey(key: WorkflowStateKey, enteredAt: ISODateString, reason?: string): WorkflowState {
    return new WorkflowState({
      id: this.id,
      serviceCallId: this.serviceCallId,
      key,
      enteredAt,
      reason,
    });
  }
}
