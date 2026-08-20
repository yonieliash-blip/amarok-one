import type {
  OrganizationMember,
  ServiceCall,
  ServiceCallLifecycleView,
  ServiceCallTimelineEvent,
  ServiceCallVisit,
} from "@amarok-one/types";

export type ServiceCallHistoryEventType =
  | "created"
  | "technician_dispatched"
  | "additional_visit"
  | "technician_departed"
  | "work_started"
  | "visit_finished"
  | "closed";

export interface ServiceCallHistoryEvent {
  id: string;
  type: ServiceCallHistoryEventType;
  occurredAt: string;
  sequence: number;
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
    sequence: 0,
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
        sequence: findVisitScheduledSequence(visit.id, lifecycle.timeline) ?? visit.sequence,
        technicianName,
      });
    } else {
      const previousVisit = sortedVisits[index - 1];
      const isContinuationByOtherTechnician =
        previousVisit !== undefined &&
        Boolean(visit.technicianId) &&
        visit.technicianId !== previousVisit.technicianId;

      events.push({
        id: `visit-additional-${visit.id}`,
        type: "additional_visit",
        occurredAt,
        sequence: findVisitScheduledSequence(visit.id, lifecycle.timeline) ?? visit.sequence,
        technicianName,
        isContinuationByOtherTechnician,
      });
    }

    addVisitMilestone(
      events,
      lifecycle.timeline,
      visit,
      "visit.driving_started",
      "technician_departed",
      visit.drivingStartedAt,
      technicianName,
    );
    addVisitMilestone(
      events,
      lifecycle.timeline,
      visit,
      "visit.working_started",
      "work_started",
      visit.workingStartedAt,
      technicianName,
    );
    addVisitMilestone(
      events,
      lifecycle.timeline,
      visit,
      ["visit.finished", "visit.completed"],
      "visit_finished",
      visit.finishedAt,
      technicianName,
    );
  }

  const closedEvent = findClosedEvent(lifecycle.timeline);
  if (closedEvent || lifecycle.lifecycleState === "closed" || serviceCall.completedAt) {
    const closedByName = closedEvent?.actorId ? actorNames.get(closedEvent.actorId) : undefined;

    events.push({
      id: closedEvent?.id ?? "service-call-closed",
      type: "closed",
      occurredAt:
        closedEvent?.occurredAt ?? serviceCall.completedAt ?? sortedVisits.at(-1)?.finishedAt ?? "",
      sequence: closedEvent?.sequence ?? Number.MAX_SAFE_INTEGER,
      closedByName,
    });
  }

  return events
    .filter((event) => event.occurredAt)
    .sort((left, right) => {
      const timestampDifference =
        new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime();
      if (timestampDifference !== 0) {
        return timestampDifference;
      }
      const sequenceDifference = left.sequence - right.sequence;
      return sequenceDifference !== 0 ? sequenceDifference : left.id.localeCompare(right.id);
    });
}

function addVisitMilestone(
  events: ServiceCallHistoryEvent[],
  timeline: ServiceCallTimelineEvent[],
  visit: ServiceCallVisit,
  workflowTypes: string | string[],
  type: Extract<
    ServiceCallHistoryEventType,
    "technician_departed" | "work_started" | "visit_finished"
  >,
  fallbackOccurredAt: string | undefined,
  technicianName: string | undefined,
): void {
  const acceptedTypes = Array.isArray(workflowTypes) ? workflowTypes : [workflowTypes];
  const workflowEvent = timeline.find(
    (event) => acceptedTypes.includes(event.type) && event.payload.visitId === visit.id,
  );
  const occurredAt = workflowEvent?.occurredAt ?? fallbackOccurredAt;
  if (!occurredAt) return;

  events.push({
    id: workflowEvent?.id ?? `${type}-${visit.id}`,
    type,
    occurredAt,
    sequence: workflowEvent?.sequence ?? visit.sequence,
    technicianName,
  });
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

function findVisitScheduledSequence(
  visitId: string,
  timeline: ServiceCallTimelineEvent[],
): number | undefined {
  const scheduledEvent = timeline.find(
    (event) => event.type === "visit.scheduled" && event.payload.visitId === visitId,
  );
  return scheduledEvent?.sequence;
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
