import type { VisitStatus } from "@amarok-one/workflow";

export interface WorkflowVisitSnapshot {
  readonly id: string;
  readonly sequence: number;
  readonly status: VisitStatus;
  readonly assignedTechnicianId?: string;
}

/** Latest visit matching any of the given statuses (highest sequence wins). */
export function selectLatestVisitByStatuses(
  visits: readonly WorkflowVisitSnapshot[],
  statuses: readonly VisitStatus[],
): WorkflowVisitSnapshot | undefined {
  const statusSet = new Set(statuses);
  let selected: WorkflowVisitSnapshot | undefined;

  for (const visit of visits) {
    if (!statusSet.has(visit.status)) {
      continue;
    }
    if (!selected || visit.sequence > selected.sequence) {
      selected = visit;
    }
  }

  return selected;
}

export function hasAssignmentVisitForTechnician(
  visits: readonly WorkflowVisitSnapshot[],
  technicianId: string,
): boolean {
  return visits.some(
    (visit) =>
      visit.assignedTechnicianId === technicianId &&
      (visit.status === "planned" ||
        visit.status === "assigned" ||
        visit.status === "in_progress" ||
        visit.status === "completed"),
  );
}
