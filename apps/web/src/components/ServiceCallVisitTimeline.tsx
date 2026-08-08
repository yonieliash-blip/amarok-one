import type { LucideIcon } from "lucide-react";
import { CircleCheck, ClipboardPlus, UserCheck, UserPlus, Users } from "lucide-react";
import type { OrganizationMember, ServiceCall, ServiceCallLifecycleView } from "@amarok-one/types";
import { formatDateTime } from "../i18n/format";
import { useTranslation } from "../i18n/useTranslation";
import {
  buildActorNameLookup,
  buildServiceCallHistoryTimeline,
  type ServiceCallHistoryEvent,
  type ServiceCallHistoryEventType,
} from "../lib/service-call-history-timeline";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";

interface ServiceCallVisitTimelineProps {
  serviceCall: ServiceCall;
  assignees: OrganizationMember[];
  lifecycle: ServiceCallLifecycleView | null;
  status: "idle" | "loading" | "ready" | "error";
  errorMessage?: string | null;
  onRetry?: () => void;
}

const HISTORY_EVENT_ICONS: Record<ServiceCallHistoryEventType, LucideIcon> = {
  created: ClipboardPlus,
  technician_dispatched: UserCheck,
  additional_visit: UserPlus,
  closed: CircleCheck,
};

export function ServiceCallVisitTimeline({
  serviceCall,
  assignees,
  lifecycle,
  status,
  errorMessage,
  onRetry,
}: ServiceCallVisitTimelineProps) {
  const { t, locale } = useTranslation();
  const emptyValue = t("common", "emptyValue");

  if (status === "loading") {
    return <LoadingState message={t("serviceCalls", "loadingVisits")} />;
  }

  if (status === "error") {
    return (
      <ErrorState
        title={t("serviceCalls", "loadVisitsErrorTitle")}
        message={errorMessage ?? t("serviceCalls", "loadVisitsErrorMessage")}
        onRetry={onRetry}
      />
    );
  }

  if (!lifecycle) {
    return null;
  }

  const actorNames = buildActorNameLookup(assignees, lifecycle.visits);
  const historyEvents = buildServiceCallHistoryTimeline(serviceCall, lifecycle, actorNames);

  return (
    <div className="service-call-visit-timeline">
      <section className="customer-detail-card customer-detail-card--wide">
        <h3>{t("serviceCalls", "timelineSection")}</h3>
        {historyEvents.length === 0 ? (
          <p className="customer-detail-notes">{t("serviceCalls", "noTimelineEvents")}</p>
        ) : (
          <ol className="service-call-history-timeline">
            {historyEvents.map((event, index) => (
              <HistoryTimelineItem
                key={event.id}
                event={event}
                isLast={index === historyEvents.length - 1}
                locale={locale}
                emptyValue={emptyValue}
                t={t}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

interface HistoryTimelineItemProps {
  event: ServiceCallHistoryEvent;
  isLast: boolean;
  locale: Parameters<typeof formatDateTime>[1];
  emptyValue: string;
  t: ReturnType<typeof useTranslation>["t"];
}

function HistoryTimelineItem({ event, isLast, locale, emptyValue, t }: HistoryTimelineItemProps) {
  const Icon =
    event.type === "additional_visit" && event.isContinuationByOtherTechnician
      ? Users
      : HISTORY_EVENT_ICONS[event.type];

  const title = getHistoryEventTitle(t, event);
  const detail = getHistoryEventDetail(t, event, emptyValue);

  return (
    <li
      className={`service-call-history-timeline__event${isLast ? " service-call-history-timeline__event--last" : ""}`}
    >
      <div
        className={`service-call-history-timeline__icon service-call-history-timeline__icon--${event.type}`}
      >
        <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="service-call-history-timeline__content">
        <p className="service-call-history-timeline__title">{title}</p>
        <time dateTime={event.occurredAt} className="service-call-history-timeline__time">
          {formatDateTime(event.occurredAt, locale)}
        </time>
        {detail ? <p className="service-call-history-timeline__detail">{detail}</p> : null}
      </div>
    </li>
  );
}

function getHistoryEventTitle(
  t: ReturnType<typeof useTranslation>["t"],
  event: ServiceCallHistoryEvent,
): string {
  switch (event.type) {
    case "created":
      return t("serviceCalls", "historyEventCreated");
    case "technician_dispatched":
      return t("serviceCalls", "historyEventTechnicianDispatched");
    case "additional_visit":
      return event.isContinuationByOtherTechnician
        ? t("serviceCalls", "historyEventContinuationVisit")
        : t("serviceCalls", "historyEventAdditionalVisit");
    case "closed":
      return t("serviceCalls", "historyEventClosed");
  }
}

function getHistoryEventDetail(
  t: ReturnType<typeof useTranslation>["t"],
  event: ServiceCallHistoryEvent,
  emptyValue: string,
): string | null {
  switch (event.type) {
    case "created":
      return event.creatorName
        ? t("serviceCalls", "historyEventCreatedBy", { name: event.creatorName })
        : null;
    case "technician_dispatched":
    case "additional_visit":
      return t("serviceCalls", "historyEventTechnicianName", {
        name: event.technicianName ?? emptyValue,
      });
    case "closed":
      return event.closedByName
        ? t("serviceCalls", "historyEventClosedBy", { name: event.closedByName })
        : null;
  }
}
