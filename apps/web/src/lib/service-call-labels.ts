import type { ServiceCallPriority, ServiceCallStatus } from "@amarok-one/types";
import type { I18nContextValue } from "../i18n/i18n-context";

export const SERVICE_CALL_STATUS_KEYS: Record<ServiceCallStatus, string> = {
  open: "statusOpen",
  scheduled: "statusScheduled",
  in_progress: "statusInProgress",
  waiting_for_parts: "statusWaitingForParts",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
};

export const SERVICE_CALL_PRIORITY_KEYS: Record<ServiceCallPriority, string> = {
  low: "priorityLow",
  normal: "priorityNormal",
  high: "priorityHigh",
  urgent: "priorityUrgent",
};

export function getServiceCallStatusLabel(
  t: I18nContextValue["t"],
  status: ServiceCallStatus,
): string {
  return t("serviceCalls", SERVICE_CALL_STATUS_KEYS[status]);
}

export function getServiceCallPriorityLabel(
  t: I18nContextValue["t"],
  priority: ServiceCallPriority,
): string {
  return t("serviceCalls", SERVICE_CALL_PRIORITY_KEYS[priority]);
}
