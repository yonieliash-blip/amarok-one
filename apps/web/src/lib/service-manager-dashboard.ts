import type { ServiceCall, ServiceCallLifecycleState } from "@amarok-one/types";
import { listServiceCallsRequest, type ListServiceCallsParams } from "./service-calls-api";

export type ServiceManagerBucket =
  | "current"
  | "waiting_assignment"
  | "in_progress"
  | "waiting_for_parts"
  | "waiting_manager"
  | "completed_today";

export function isCancelledServiceCall(call: ServiceCall): boolean {
  return call.status === "cancelled";
}

export function isClosedServiceCall(call: ServiceCall): boolean {
  return call.lifecycleState === "closed" || call.status === "completed";
}

export function isActiveServiceCall(call: ServiceCall): boolean {
  return !isCancelledServiceCall(call) && !isClosedServiceCall(call);
}

export function isCompletedToday(call: ServiceCall, todayStart: Date, todayEnd: Date): boolean {
  if (!isClosedServiceCall(call) || !call.completedAt) {
    return false;
  }
  const completed = new Date(call.completedAt);
  return completed >= todayStart && completed <= todayEnd;
}

export function isWaitingAssignment(call: ServiceCall): boolean {
  return call.lifecycleState === "waiting_assignment" || call.lifecycleState === "new";
}

export function isWaitingForParts(call: ServiceCall): boolean {
  return call.lifecycleState === "waiting_for_parts" || call.status === "waiting_for_parts";
}

export function isWaitingForManager(call: ServiceCall): boolean {
  return call.lifecycleState === "waiting_manager_closure";
}

const IN_PROGRESS_LIFECYCLE: readonly ServiceCallLifecycleState[] = [
  "assigned",
  "driving",
  "working",
  "waiting_customer",
  "waiting_specialist",
];

export function isInProgressServiceCall(call: ServiceCall): boolean {
  if (!isActiveServiceCall(call)) {
    return false;
  }
  if (isWaitingAssignment(call) || isWaitingForParts(call) || isWaitingForManager(call)) {
    return false;
  }
  return (
    IN_PROGRESS_LIFECYCLE.includes(call.lifecycleState) ||
    call.status === "in_progress" ||
    call.status === "scheduled"
  );
}

export function matchesServiceManagerBucket(
  call: ServiceCall,
  bucket: ServiceManagerBucket,
  todayStart: Date,
  todayEnd: Date,
): boolean {
  switch (bucket) {
    case "completed_today":
      return isCompletedToday(call, todayStart, todayEnd);
    case "waiting_assignment":
      return isActiveServiceCall(call) && isWaitingAssignment(call);
    case "in_progress":
      return isInProgressServiceCall(call);
    case "waiting_for_parts":
      return isActiveServiceCall(call) && isWaitingForParts(call);
    case "waiting_manager":
      return isActiveServiceCall(call) && isWaitingForManager(call);
    case "current":
      return isActiveServiceCall(call);
    default: {
      const _exhaustive: never = bucket;
      return _exhaustive;
    }
  }
}

export function countByBucket(
  calls: readonly ServiceCall[],
  bucket: ServiceManagerBucket,
  todayStart: Date,
  todayEnd: Date,
): number {
  return calls.filter((call) => matchesServiceManagerBucket(call, bucket, todayStart, todayEnd))
    .length;
}

export function startOfLocalDay(reference: Date): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 0, 0, 0, 0);
}

export function endOfLocalDay(reference: Date): Date {
  return new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
    23,
    59,
    59,
    999,
  );
}

export function filterDashboardCalls(
  calls: readonly ServiceCall[],
  options: {
    bucket: ServiceManagerBucket;
    todayStart: Date;
    todayEnd: Date;
    search?: string;
    priority?: ServiceCall["priority"] | "";
    assigneeId?: string;
  },
): ServiceCall[] {
  const term = options.search?.trim().toLowerCase() ?? "";

  return calls.filter((call) => {
    if (!matchesServiceManagerBucket(call, options.bucket, options.todayStart, options.todayEnd)) {
      return false;
    }
    if (options.priority && call.priority !== options.priority) {
      return false;
    }
    if (options.assigneeId === "unassigned") {
      if (call.assignedUserId) {
        return false;
      }
    } else if (options.assigneeId && call.assignedUserId !== options.assigneeId) {
      return false;
    }
    if (!term) {
      return true;
    }
    const haystack = [
      call.serviceCallNumber,
      call.title,
      call.customer?.name,
      call.equipment?.name,
      call.assignedUser?.displayName,
      call.location,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}

export async function fetchAllServiceCalls(
  organizationId: string,
  accessToken: string,
  params: Omit<ListServiceCallsParams, "page" | "pageSize"> = {},
): Promise<ServiceCall[]> {
  const pageSize = 100;
  const collected: ServiceCall[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (collected.length < total) {
    const result = await listServiceCallsRequest(organizationId, accessToken, {
      ...params,
      page,
      pageSize,
    });
    collected.push(...result.data);
    total = result.meta?.total ?? result.data.length;
    if (result.data.length === 0) {
      break;
    }
    page += 1;
  }

  return collected;
}
