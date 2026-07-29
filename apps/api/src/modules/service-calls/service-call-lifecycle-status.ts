import type { ServiceCallLifecycleState, ServiceCallStatus } from "@amarok-one/types";

/** Best-effort mapping from Sprint 4 lifecycle to legacy API status. */
export function legacyStatusForLifecycle(state: ServiceCallLifecycleState): ServiceCallStatus {
  switch (state) {
    case "new":
    case "waiting_assignment":
      return "open";
    case "assigned":
    case "driving":
      return "scheduled";
    case "working":
      return "in_progress";
    case "waiting_for_parts":
      return "waiting_for_parts";
    case "waiting_customer":
    case "waiting_specialist":
    case "waiting_manager_closure":
      return "in_progress";
    case "closed":
      return "completed";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
