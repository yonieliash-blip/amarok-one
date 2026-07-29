import type { VisitStatus } from "./visit.js";
import { WorkflowDomainError } from "./domain-error.js";

const ACTIVE_VISIT_STATUSES: readonly VisitStatus[] = [
  "assigned",
  "driving",
  "working",
  "planned",
  "checked_in",
  "in_progress",
];

const ALLOWED_VISIT_TRANSITIONS: Partial<Record<VisitStatus, readonly VisitStatus[]>> = {
  assigned: ["driving", "cancelled"],
  driving: ["working", "assigned"],
  working: ["finished", "cancelled"],
  planned: ["assigned", "checked_in", "in_progress", "cancelled"],
  checked_in: ["in_progress", "cancelled"],
  in_progress: ["completed", "finished", "cancelled"],
};

export function assertVisitStatusTransition(from: VisitStatus, to: VisitStatus): void {
  if (from === to) {
    return;
  }
  const allowed = ALLOWED_VISIT_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new WorkflowDomainError(
      "INVALID_STATE_TRANSITION",
      `Visit transition ${from} → ${to} is not allowed`,
      { from, to },
    );
  }
}

export function isActiveVisitStatus(status: VisitStatus): boolean {
  return ACTIVE_VISIT_STATUSES.includes(status);
}

export function assertVisitOwnedByTechnician(
  assignedTechnicianId: string | undefined,
  technicianId: string,
): void {
  if (!assignedTechnicianId || assignedTechnicianId !== technicianId) {
    throw new WorkflowDomainError("INVALID_COMMAND", "Technician does not own this visit", {
      technicianId,
    });
  }
}
