import type { ServiceCallLifecycleState, ServiceCallStatus } from "@amarok-one/types";
import type { ServiceCallService } from "./service-call.service.js";

const TARGET_LIFECYCLE_BY_STATUS: Record<ServiceCallStatus, ServiceCallLifecycleState> = {
  open: "waiting_assignment",
  scheduled: "waiting_assignment",
  in_progress: "waiting_assignment",
  waiting_for_parts: "waiting_assignment",
  completed: "closed",
  cancelled: "closed",
};

/**
 * Aligns seeded/demo service call workflow state with operational status.
 * Only advances calls still at `new` — does not weaken lifecycle rules.
 */
export async function syncSeededServiceCallWorkflowLifecycle(
  serviceCallService: ServiceCallService,
  organizationId: string,
  serviceCallId: string,
  status: ServiceCallStatus,
  actorId?: string,
): Promise<ServiceCallLifecycleState> {
  await serviceCallService.reconcileServiceCallWorkflow(organizationId, serviceCallId, actorId);

  const targetLifecycle = TARGET_LIFECYCLE_BY_STATUS[status];
  let lifecycle = await serviceCallService.getServiceCallLifecycle(organizationId, serviceCallId);

  if (lifecycle.lifecycleState === targetLifecycle) {
    return lifecycle.lifecycleState;
  }

  if (lifecycle.lifecycleState !== "new") {
    return lifecycle.lifecycleState;
  }

  if (!actorId) {
    throw new Error("actorId is required to sync service call workflow lifecycle");
  }

  if (targetLifecycle === "closed") {
    lifecycle = await serviceCallService.closeServiceCallLifecycle(
      organizationId,
      serviceCallId,
      actorId,
      "seed_sync",
    );
  } else if (targetLifecycle === "waiting_assignment") {
    lifecycle = await serviceCallService.transitionServiceCallLifecycle(
      organizationId,
      serviceCallId,
      { toLifecycleState: "waiting_assignment", reason: "seed_sync" },
      actorId,
    );
  }

  return lifecycle.lifecycleState;
}

export { TARGET_LIFECYCLE_BY_STATUS };
