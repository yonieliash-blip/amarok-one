import type { ServiceCallStatus } from "@amarok-one/types";

const VALID_TRANSITIONS: Record<ServiceCallStatus, readonly ServiceCallStatus[]> = {
  open: ["scheduled", "in_progress", "cancelled"],
  scheduled: ["open", "in_progress", "cancelled"],
  in_progress: ["waiting_for_parts", "completed", "cancelled", "scheduled"],
  waiting_for_parts: ["in_progress", "cancelled"],
  completed: ["open"],
  cancelled: ["open"],
};

export function canTransitionServiceCallStatus(
  from: ServiceCallStatus,
  to: ServiceCallStatus,
): boolean {
  if (from === to) {
    return true;
  }

  return VALID_TRANSITIONS[from].includes(to);
}

export function assertValidServiceCallStatusTransition(
  from: ServiceCallStatus,
  to: ServiceCallStatus,
): void {
  if (!canTransitionServiceCallStatus(from, to)) {
    throw new Error(`Invalid status transition from '${from}' to '${to}'`);
  }
}

export function getAllowedServiceCallStatusTransitions(
  from: ServiceCallStatus,
): readonly ServiceCallStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}
