import type { ISODateString } from "./primitives.js";
import type { ServiceCallId, WorkflowStateId } from "./identifiers.js";
import { WorkflowDomainError } from "./domain-error.js";

/** Control-center service call lifecycle (Sprint 4 business workflow). */
export type ServiceCallLifecycleKey =
  | "new"
  | "waiting_assignment"
  | "assigned"
  | "driving"
  | "working"
  | "waiting_for_parts"
  | "waiting_customer"
  | "waiting_specialist"
  | "waiting_manager_closure"
  | "closed";

export interface ServiceCallLifecycleProps {
  id: WorkflowStateId;
  serviceCallId: ServiceCallId;
  key: ServiceCallLifecycleKey;
  enteredAt: ISODateString;
  reason?: string;
}

export class ServiceCallLifecycle {
  readonly id: WorkflowStateId;
  readonly serviceCallId: ServiceCallId;
  readonly key: ServiceCallLifecycleKey;
  readonly enteredAt: ISODateString;
  readonly reason: string | undefined;

  private constructor(props: ServiceCallLifecycleProps) {
    this.id = props.id;
    this.serviceCallId = props.serviceCallId;
    this.key = props.key;
    this.enteredAt = props.enteredAt;
    this.reason = props.reason;
  }

  static create(props: ServiceCallLifecycleProps): ServiceCallLifecycle {
    return new ServiceCallLifecycle(props);
  }

  withKey(
    key: ServiceCallLifecycleKey,
    enteredAt: ISODateString,
    reason?: string,
  ): ServiceCallLifecycle {
    return new ServiceCallLifecycle({
      id: this.id,
      serviceCallId: this.serviceCallId,
      key,
      enteredAt,
      reason,
    });
  }
}

const ALLOWED_LIFECYCLE_TRANSITIONS: Record<
  ServiceCallLifecycleKey,
  readonly ServiceCallLifecycleKey[]
> = {
  new: ["waiting_assignment", "closed"],
  waiting_assignment: ["assigned", "waiting_manager_closure", "closed"],
  assigned: ["driving", "waiting_assignment", "waiting_manager_closure"],
  driving: ["working", "assigned"],
  working: [
    "waiting_for_parts",
    "waiting_customer",
    "waiting_specialist",
    "waiting_manager_closure",
    "waiting_assignment",
  ],
  waiting_for_parts: ["working", "waiting_manager_closure"],
  waiting_customer: ["working", "waiting_manager_closure"],
  waiting_specialist: ["working", "waiting_manager_closure"],
  waiting_manager_closure: ["closed", "working", "waiting_assignment"],
  closed: [],
};

export function assertServiceCallLifecycleTransition(
  from: ServiceCallLifecycleKey,
  to: ServiceCallLifecycleKey,
): void {
  if (from === to) {
    return;
  }
  if (!ALLOWED_LIFECYCLE_TRANSITIONS[from].includes(to)) {
    throw new WorkflowDomainError(
      "INVALID_STATE_TRANSITION",
      `Lifecycle transition ${from} → ${to} is not allowed`,
      { from, to },
    );
  }
}

export function isServiceCallLifecycleKey(value: string): value is ServiceCallLifecycleKey {
  return (
    value === "new" ||
    value === "waiting_assignment" ||
    value === "assigned" ||
    value === "driving" ||
    value === "working" ||
    value === "waiting_for_parts" ||
    value === "waiting_customer" ||
    value === "waiting_specialist" ||
    value === "waiting_manager_closure" ||
    value === "closed"
  );
}
