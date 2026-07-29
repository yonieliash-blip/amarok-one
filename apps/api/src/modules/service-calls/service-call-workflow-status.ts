import type { ServiceCallStatus } from "@amarok-one/types";
import type { WorkflowStateKey } from "@amarok-one/workflow";

/**
 * Anti-corruption: maps operational service-call status (API) to workflow state keys.
 * Does not encode transition rules — those remain in service-call-transitions and WorkflowEngine.
 */
export function serviceCallStatusToWorkflowStateKey(status: ServiceCallStatus): WorkflowStateKey {
  switch (status) {
    case "open":
      return "draft";
    case "scheduled":
      return "scheduled";
    case "in_progress":
      return "in_field";
    case "waiting_for_parts":
      return "waiting";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
