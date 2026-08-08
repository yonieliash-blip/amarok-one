import { describe, expect, it } from "vitest";
import type { ServiceCallTimelineEvent } from "@amarok-one/types";
import { getServiceCallTimelineEventLabel } from "./service-call-timeline-labels";

const t = ((namespace: string, key: string, params?: Record<string, string>) => {
  if (namespace !== "serviceCalls") {
    return key;
  }
  if (key === "timelineLifecycleChangedTo" && params?.state) {
    return `Lifecycle changed to ${params.state}`;
  }
  if (key === "lifecycleDriving") {
    return "En route";
  }
  return key;
}) as Parameters<typeof getServiceCallTimelineEventLabel>[0];

describe("getServiceCallTimelineEventLabel", () => {
  it("maps known workflow event types", () => {
    const event: ServiceCallTimelineEvent = {
      id: "1",
      type: "visit.driving_started",
      sequence: 1,
      occurredAt: "2026-07-19T08:00:00.000Z",
      payload: { visitId: "visit-1" },
    };
    expect(getServiceCallTimelineEventLabel(t, event)).toBe("timelineVisitDrivingStarted");
  });

  it("includes target lifecycle state for lifecycle_changed events", () => {
    const event: ServiceCallTimelineEvent = {
      id: "2",
      type: "service_call.lifecycle_changed",
      sequence: 2,
      occurredAt: "2026-07-19T09:00:00.000Z",
      payload: { toLifecycleKey: "driving" },
    };
    expect(getServiceCallTimelineEventLabel(t, event)).toBe("Lifecycle changed to En route");
  });

  it("falls back to a readable type string for unknown events", () => {
    const event: ServiceCallTimelineEvent = {
      id: "3",
      type: "custom.unknown_event",
      sequence: 3,
      occurredAt: "2026-07-19T10:00:00.000Z",
      payload: {},
    };
    expect(getServiceCallTimelineEventLabel(t, event)).toBe("custom.unknown event");
  });
});
