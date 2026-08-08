import type { ServiceCallTimelineEvent, ServiceCallVisitStatus } from "@amarok-one/types";
import type { I18nContextValue } from "../i18n/i18n-context";
import type { TranslationMessages } from "../i18n/types";
import {
  getServiceCallLifecycleLabel,
  SERVICE_CALL_LIFECYCLE_KEYS,
} from "./service-call-lifecycle-labels";

type ServiceCallsMessageKey = keyof TranslationMessages["serviceCalls"];

const TIMELINE_EVENT_KEYS: Partial<Record<string, ServiceCallsMessageKey>> = {
  "service_call.workflow_initialized": "timelineWorkflowInitialized",
  "service_call.lifecycle_changed": "timelineLifecycleChanged",
  "service_call.state_changed": "timelineStateChanged",
  "service_call.operational_status_recorded": "timelineOperationalStatusRecorded",
  "service_call.closed": "timelineServiceCallClosed",
  "visit.scheduled": "timelineVisitScheduled",
  "visit.started": "timelineVisitStarted",
  "visit.driving_started": "timelineVisitDrivingStarted",
  "visit.working_started": "timelineVisitWorkingStarted",
  "visit.finished": "timelineVisitFinished",
  "visit.completed": "timelineVisitCompleted",
  "visit.cancelled": "timelineVisitCancelled",
};

export const VISIT_STATUS_KEYS: Record<ServiceCallVisitStatus, ServiceCallsMessageKey> = {
  planned: "visitStatusPlanned",
  assigned: "visitStatusAssigned",
  driving: "visitStatusDriving",
  working: "visitStatusWorking",
  finished: "visitStatusFinished",
  cancelled: "visitStatusCancelled",
  checked_in: "visitStatusCheckedIn",
  in_progress: "visitStatusInProgress",
  completed: "visitStatusCompleted",
};

function lifecycleKeyFromPayload(payload: Record<string, unknown>): string | undefined {
  const candidates = [
    payload.toLifecycleKey,
    payload.nextLifecycleKey,
    payload.lifecycleKey,
    payload.toLifecycleState,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value in SERVICE_CALL_LIFECYCLE_KEYS) {
      return value;
    }
  }
  return undefined;
}

export function getServiceCallVisitStatusLabel(
  t: I18nContextValue["t"],
  status: ServiceCallVisitStatus,
): string {
  return t("serviceCalls", VISIT_STATUS_KEYS[status]);
}

export function getServiceCallTimelineEventLabel(
  t: I18nContextValue["t"],
  event: ServiceCallTimelineEvent,
): string {
  const key = TIMELINE_EVENT_KEYS[event.type];
  if (key) {
    if (event.type === "service_call.lifecycle_changed") {
      const lifecycleKey = lifecycleKeyFromPayload(event.payload);
      if (lifecycleKey) {
        return t("serviceCalls", "timelineLifecycleChangedTo", {
          state: getServiceCallLifecycleLabel(
            t,
            lifecycleKey as keyof typeof SERVICE_CALL_LIFECYCLE_KEYS,
          ),
        });
      }
    }
    return t("serviceCalls", key);
  }

  return event.type.replace(/_/g, " ");
}
