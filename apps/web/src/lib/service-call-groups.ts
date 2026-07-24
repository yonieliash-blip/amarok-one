import type { ServiceCall } from "@amarok-one/types";

export type ServiceCallSection = "today" | "upcoming" | "completed";

export interface GroupedServiceCalls {
  today: ServiceCall[];
  upcoming: ServiceCall[];
  completed: ServiceCall[];
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isCompleted(status: ServiceCall["status"]): boolean {
  return status === "completed" || status === "cancelled";
}

function isTodayCall(call: ServiceCall, now: Date): boolean {
  if (isCompleted(call.status)) {
    return false;
  }

  if (call.scheduledAt && isSameDay(new Date(call.scheduledAt), now)) {
    return true;
  }

  if (call.openedAt && isSameDay(new Date(call.openedAt), now)) {
    return true;
  }

  return call.status === "in_progress" || call.status === "waiting_for_parts";
}

export function groupTechnicianServiceCalls(
  calls: ServiceCall[],
  now: Date = new Date(),
): GroupedServiceCalls {
  const completed = calls.filter((call) => isCompleted(call.status));
  const active = calls.filter((call) => !isCompleted(call.status));
  const today = active.filter((call) => isTodayCall(call, now));
  const todayIds = new Set(today.map((call) => call.id));
  const upcoming = active.filter((call) => !todayIds.has(call.id));

  return { today, upcoming, completed };
}
