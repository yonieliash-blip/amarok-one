import type { ServiceCallTimelineEvent } from "@amarok-one/types";
import type { LocalTimelineEntry } from "../storage/technician-storage";

export interface MergedTimelineItem {
  id: string;
  label: string;
  occurredAt: string;
  source: "workflow" | "local";
}

function workflowLabel(event: ServiceCallTimelineEvent): string {
  const type = event.type.replace(/_/g, " ");
  const visitId =
    typeof event.payload.visitId === "string" ? event.payload.visitId.slice(0, 8) : undefined;
  if (visitId) {
    return `${type} (visit ${visitId}…)`;
  }
  return type;
}

export function mergeTimeline(
  workflow: readonly ServiceCallTimelineEvent[],
  local: readonly LocalTimelineEntry[],
): MergedTimelineItem[] {
  const fromWorkflow: MergedTimelineItem[] = workflow.map((event) => ({
    id: `wf-${event.id}`,
    label: workflowLabel(event),
    occurredAt: event.occurredAt,
    source: "workflow",
  }));

  const fromLocal: MergedTimelineItem[] = local.map((entry) => ({
    id: `local-${entry.id}`,
    label: entry.label,
    occurredAt: entry.occurredAt,
    source: "local",
  }));

  return [...fromWorkflow, ...fromLocal].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
}
