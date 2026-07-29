import type { ServiceCallLifecycleState } from "@amarok-one/types";
import type { I18nContextValue } from "../i18n/i18n-context";

export const SERVICE_CALL_LIFECYCLE_KEYS: Record<ServiceCallLifecycleState, string> = {
  new: "lifecycleNew",
  waiting_assignment: "lifecycleWaitingAssignment",
  assigned: "lifecycleAssigned",
  driving: "lifecycleDriving",
  working: "lifecycleWorking",
  waiting_for_parts: "lifecycleWaitingForParts",
  waiting_customer: "lifecycleWaitingCustomer",
  waiting_specialist: "lifecycleWaitingSpecialist",
  waiting_manager_closure: "lifecycleWaitingManager",
  closed: "lifecycleClosed",
};

export type LifecycleBadgeVariant = "success" | "default" | "warning" | "danger";

export const LIFECYCLE_BADGE_VARIANTS: Record<ServiceCallLifecycleState, LifecycleBadgeVariant> = {
  new: "default",
  waiting_assignment: "warning",
  assigned: "default",
  driving: "warning",
  working: "warning",
  waiting_for_parts: "danger",
  waiting_customer: "default",
  waiting_specialist: "default",
  waiting_manager_closure: "warning",
  closed: "success",
};

export function getServiceCallLifecycleLabel(
  t: I18nContextValue["t"],
  state: ServiceCallLifecycleState,
): string {
  return t("serviceCalls", SERVICE_CALL_LIFECYCLE_KEYS[state]);
}
