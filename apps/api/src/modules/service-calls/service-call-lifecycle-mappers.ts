import type { ServiceCallLifecycleState, ServiceCallVisitStatus } from "@amarok-one/types";
import type {
  ServiceCallLifecycleState as PrismaLifecycleState,
  ServiceCallVisitStatus as PrismaVisitStatus,
} from "@prisma/client";

export const LIFECYCLE_STATE_TO_DTO: Record<PrismaLifecycleState, ServiceCallLifecycleState> = {
  NEW: "new",
  WAITING_ASSIGNMENT: "waiting_assignment",
  ASSIGNED: "assigned",
  DRIVING: "driving",
  WORKING: "working",
  WAITING_FOR_PARTS: "waiting_for_parts",
  WAITING_CUSTOMER: "waiting_customer",
  WAITING_SPECIALIST: "waiting_specialist",
  WAITING_MANAGER_CLOSURE: "waiting_manager_closure",
  CLOSED: "closed",
};

export const LIFECYCLE_STATE_FROM_DTO: Record<ServiceCallLifecycleState, PrismaLifecycleState> = {
  new: "NEW",
  waiting_assignment: "WAITING_ASSIGNMENT",
  assigned: "ASSIGNED",
  driving: "DRIVING",
  working: "WORKING",
  waiting_for_parts: "WAITING_FOR_PARTS",
  waiting_customer: "WAITING_CUSTOMER",
  waiting_specialist: "WAITING_SPECIALIST",
  waiting_manager_closure: "WAITING_MANAGER_CLOSURE",
  closed: "CLOSED",
};

export const VISIT_STATUS_TO_DTO: Record<PrismaVisitStatus, ServiceCallVisitStatus> = {
  PLANNED: "planned",
  ASSIGNED: "assigned",
  DRIVING: "driving",
  WORKING: "working",
  FINISHED: "finished",
  CANCELLED: "cancelled",
  CHECKED_IN: "checked_in",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
};

export const VISIT_STATUS_FROM_DTO: Record<ServiceCallVisitStatus, PrismaVisitStatus> = {
  planned: "PLANNED",
  assigned: "ASSIGNED",
  driving: "DRIVING",
  working: "WORKING",
  finished: "FINISHED",
  cancelled: "CANCELLED",
  checked_in: "CHECKED_IN",
  in_progress: "IN_PROGRESS",
  completed: "COMPLETED",
};

export function toServiceCallLifecycleStateDto(
  value: PrismaLifecycleState,
): ServiceCallLifecycleState {
  return LIFECYCLE_STATE_TO_DTO[value];
}

export function fromServiceCallLifecycleStateDto(
  value: ServiceCallLifecycleState,
): PrismaLifecycleState {
  return LIFECYCLE_STATE_FROM_DTO[value] as PrismaLifecycleState;
}

export function toServiceCallVisitStatusDto(value: PrismaVisitStatus): ServiceCallVisitStatus {
  return VISIT_STATUS_TO_DTO[value];
}

export function fromServiceCallVisitStatusDto(value: ServiceCallVisitStatus): PrismaVisitStatus {
  return VISIT_STATUS_FROM_DTO[value] as PrismaVisitStatus;
}
