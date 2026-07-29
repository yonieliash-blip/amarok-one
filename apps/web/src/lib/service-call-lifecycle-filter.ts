import type { ServiceCallLifecycleState, ServiceCallStatus } from "@amarok-one/types";

/** Maps lifecycle filter to coarse API status for list queries (API has no lifecycle filter yet). */
export function apiStatusForLifecycleFilter(
  lifecycle: ServiceCallLifecycleState,
): ServiceCallStatus {
  switch (lifecycle) {
    case "new":
    case "waiting_assignment":
      return "open";
    case "assigned":
    case "driving":
      return "scheduled";
    case "working":
    case "waiting_customer":
    case "waiting_specialist":
    case "waiting_manager_closure":
      return "in_progress";
    case "waiting_for_parts":
      return "waiting_for_parts";
    case "closed":
      return "completed";
    default: {
      const _exhaustive: never = lifecycle;
      return _exhaustive;
    }
  }
}

/** Manager-selectable manual lifecycle transitions (excludes new/closed). */
export const MANAGER_TRANSITION_LIFECYCLE_STATES: readonly ServiceCallLifecycleState[] = [
  "waiting_assignment",
  "waiting_for_parts",
  "waiting_customer",
  "waiting_specialist",
  "waiting_manager_closure",
];
