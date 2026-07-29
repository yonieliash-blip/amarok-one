import type { ServiceCallVisit, ServiceCallVisitStatus } from "@amarok-one/types";

const ACTIVE_VISIT_STATUSES: readonly ServiceCallVisitStatus[] = [
  "assigned",
  "driving",
  "working",
  "planned",
  "in_progress",
  "checked_in",
];

export function isActiveVisitStatus(status: ServiceCallVisitStatus): boolean {
  return ACTIVE_VISIT_STATUSES.includes(status);
}

/** Current visit for technician: highest-sequence active visit owned by user. */
export function selectTechnicianActiveVisit(
  visits: readonly ServiceCallVisit[],
  technicianId: string,
): ServiceCallVisit | undefined {
  let selected: ServiceCallVisit | undefined;

  for (const visit of visits) {
    if (visit.technicianId !== technicianId) {
      continue;
    }
    if (!isActiveVisitStatus(visit.status)) {
      continue;
    }
    if (!selected || visit.sequence > selected.sequence) {
      selected = visit;
    }
  }

  return selected;
}
