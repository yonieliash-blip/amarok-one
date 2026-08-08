import type {
  OrganizationMember,
  ServiceCall,
  ServiceCallLifecycleView,
  ServiceCallTimelineEvent,
  ServiceCallVisit,
} from "@amarok-one/types";

export type ServiceCallHistoryEventType =
  "created" | "technician_dispatched" | "additional_visit" | "closed";

export interface ServiceCallHistoryEvent {
  id: string;
  type: ServiceCallHistoryEventType;
  occurredAt: string;
  creatorName?: string;
  technicianName?: string;
  closedByName?: string;
  isContinuationByOtherTechnician?: boolean;
}

export function buildActorNameLookup(
  assignees: OrganizationMember[],
  visits: ServiceCallVisit[],
): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const assignee of assignees) {
    lookup.set(assignee.id, assignee.displayName);
  }

  for (const visit of visits) {
    if (visit.technician) {
      lookup.set(visit.technician.id, visit.technician.displayName);
    }
  }

  return lookup;
}

export function buildServiceCallHistoryTimeline(
  serviceCall: Pick<ServiceCall, "openedAt" | "createdAt" | "completedAt">,
  lifecycle: ServiceCallLifecycleView,
  actorNames: Map<string, string>,
): ServiceCallHistoryEvent[] {
  const events: ServiceCallHistoryEvent[] = [];
  const sortedVisits = [...lifecycle.visits].sort((left, right) => left.sequence - right.sequence);

  const creatorActorId = findCreatorActorId(lifecycle.timeline);
  const creatorName = creatorActorId ? actorNames.get(creatorActorId) : undefined;

  events.push({
    id: "service-call-created",
    type: "created",
    occurredAt: serviceCall.openedAt ?? serviceCall.createdAt,
    creatorName,
  });

  for (const [index, visit] of sortedVisits.entries()) {
    const technicianName = visit.technician?.displayName;
    const occurredAt =
      findVisitScheduledAt(visit.id, lifecycle.timeline) ?? visit.createdAt ?? visit.scheduledStart;
    if (!occurredAt) {
      continue;
    }

    if (index === 0) {
      events.push({
        id: `visit-dispatched-${visit.id}`,
        type: "technician_dispatched",
        occurredAt,
        technicianName,
      });
      continue;
    }

    const previousVisit = sortedVisits[index - 1];
    const isContinuationByOtherTechnician =
      previousVisit !== undefined &&
      Boolean(visit.technicianId) &&
      visit.technicianId !== previousVisit.technicianId;

    events.push({
      id: `visit-additional-${visit.id}`,
      type: "additional_visit",
      occurredAt,
      technicianName,
      isContinuationByOtherTechnician,
    });
  }

  const closedEvent = findClosedEvent(lifecycle.timeline);
  if (closedEvent || lifecycle.lifecycleState === "closed" || serviceCall.completedAt) {
    const closedByName = closedEvent?.actorId ? actorNames.get(closedEvent.actorId) : undefined;

    events.push({
      id: closedEvent?.id ?? "service-call-closed",
      type: "closed",
      occurredAt:
        closedEvent?.occurredAt ?? serviceCall.completedAt ?? sortedVisits.at(-1)?.finishedAt ?? "",
      closedByName,
    });
  }

  return events
    .filter((event) => event.occurredAt)
    .sort(
      (left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime(),
    );
}

function findVisitScheduledAt(
  visitId: string,
  timeline: ServiceCallTimelineEvent[],
): string | undefined {
  const scheduledEvent = timeline.find(
    (event) => event.type === "visit.scheduled" && event.payload.visitId === visitId,
  );
  return scheduledEvent?.occurredAt;
}

function findCreatorActorId(timeline: ServiceCallTimelineEvent[]): string | undefined {
  const createdTransition = timeline.find(
    (event) =>
      event.type === "service_call.lifecycle_changed" && event.payload.reason === "created",
  );
  if (createdTransition?.actorId) {
    return createdTransition.actorId;
  }

  const initializedEvent = timeline.find(
    (event) => event.type === "service_call.workflow_initialized",
  );
  return initializedEvent?.actorId;
}

function findClosedEvent(
  timeline: ServiceCallTimelineEvent[],
): ServiceCallTimelineEvent | undefined {
  return timeline.find((event) => event.type === "service_call.closed");
}
