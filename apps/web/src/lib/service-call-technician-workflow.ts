import type { ServiceCallVisit, ServiceCallVisitStatus } from "@amarok-one/types";

export type TechnicianVisitWorkflowAction =
  "start_driving" | "start_working" | "complete_for_manager_closure";

const ACTIVE_VISIT_STATUSES: readonly ServiceCallVisitStatus[] = [
  "assigned",
  "driving",
  "working",
  "planned",
  "checked_in",
  "in_progress",
];

/** Selects the newest active visit owned by the signed-in technician. */
export function selectTechnicianActiveVisit(
  visits: readonly ServiceCallVisit[],
  technicianId: string,
): ServiceCallVisit | undefined {
  return visits.reduce<ServiceCallVisit | undefined>((selected, visit) => {
    if (visit.technicianId !== technicianId || !ACTIVE_VISIT_STATUSES.includes(visit.status)) {
      return selected;
    }
    return !selected || visit.sequence > selected.sequence ? visit : selected;
  }, undefined);
}

/** Mirrors valid API visit actions for display only; the API remains authoritative. */
export function getTechnicianVisitWorkflowAction(
  visit: ServiceCallVisit | undefined,
): TechnicianVisitWorkflowAction | undefined {
  switch (visit?.status) {
    case "assigned":
      return "start_driving";
    case "driving":
      return "start_working";
    case "working":
    case "in_progress":
      return "complete_for_manager_closure";
    default:
      return undefined;
  }
}
