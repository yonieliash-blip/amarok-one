import { describe, expect, it } from "vitest";
import type { ServiceCallLifecycleView } from "@amarok-one/types";
import { buildServiceCallHistoryTimeline } from "./service-call-history-timeline";

const serviceCall = {
  openedAt: "2026-07-15T07:15:00.000Z",
  createdAt: "2026-07-15T07:10:00.000Z",
  completedAt: undefined,
};

function lifecycle(overrides: Partial<ServiceCallLifecycleView> = {}): ServiceCallLifecycleView {
  return {
    serviceCallId: "sc-1",
    lifecycleState: "driving",
    availableTransitions: ["working", "assigned"],
    visits: [],
    timeline: [],
    ...overrides,
  };
}

describe("buildServiceCallHistoryTimeline", () => {
  it("always includes service call created as the first event", () => {
    const events = buildServiceCallHistoryTimeline(serviceCall, lifecycle(), new Map());

    expect(events[0]).toMatchObject({
      type: "created",
      occurredAt: "2026-07-15T07:15:00.000Z",
    });
  });

  it("maps the first visit to technician dispatched", () => {
    const events = buildServiceCallHistoryTimeline(
      serviceCall,
      lifecycle({
        visits: [
          {
            id: "visit-1",
            organizationId: "org-1",
            serviceCallId: "sc-1",
            technicianId: "tech-1",
            technician: {
              id: "tech-1",
              email: "tech@demo",
              displayName: "Demo Technician",
            },
            sequence: 1,
            status: "driving",
            createdAt: "2026-07-16T08:00:00.000Z",
            updatedAt: "2026-07-16T08:00:00.000Z",
          },
        ],
        timeline: [
          {
            id: "event-1",
            type: "visit.scheduled",
            sequence: 2,
            occurredAt: "2026-07-16T08:05:00.000Z",
            payload: { visitId: "visit-1" },
          },
        ],
      }),
      new Map(),
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "technician_dispatched",
        occurredAt: "2026-07-16T08:05:00.000Z",
        technicianName: "Demo Technician",
      }),
    );
  });

  it("marks later visits from another technician as continuation", () => {
    const events = buildServiceCallHistoryTimeline(
      serviceCall,
      lifecycle({
        visits: [
          {
            id: "visit-1",
            organizationId: "org-1",
            serviceCallId: "sc-1",
            technicianId: "tech-1",
            technician: { id: "tech-1", email: "tech1@demo", displayName: "Technician One" },
            sequence: 1,
            status: "finished",
            createdAt: "2026-07-16T08:00:00.000Z",
            updatedAt: "2026-07-16T10:00:00.000Z",
          },
          {
            id: "visit-2",
            organizationId: "org-1",
            serviceCallId: "sc-1",
            technicianId: "tech-2",
            technician: { id: "tech-2", email: "tech2@demo", displayName: "Technician Two" },
            sequence: 2,
            status: "assigned",
            createdAt: "2026-08-03T09:00:00.000Z",
            updatedAt: "2026-08-03T09:00:00.000Z",
          },
        ],
        timeline: [
          {
            id: "event-1",
            type: "visit.scheduled",
            sequence: 1,
            occurredAt: "2026-07-16T08:05:00.000Z",
            payload: { visitId: "visit-1" },
          },
          {
            id: "event-2",
            type: "visit.scheduled",
            sequence: 2,
            occurredAt: "2026-08-03T09:05:00.000Z",
            payload: { visitId: "visit-2" },
          },
        ],
      }),
      new Map(),
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "additional_visit",
        occurredAt: "2026-08-03T09:05:00.000Z",
        technicianName: "Technician Two",
        isContinuationByOtherTechnician: true,
      }),
    );
    expect(
      events.filter((event) => event.type.includes("visit") || event.type.includes("dispatched")),
    ).toEqual([
      expect.objectContaining({
        type: "technician_dispatched",
        technicianName: "Technician One",
      }),
      expect.objectContaining({
        type: "additional_visit",
        technicianName: "Technician Two",
      }),
    ]);
  });

  it("shows departure, work start and visit finish with the technician name", () => {
    const events = buildServiceCallHistoryTimeline(
      serviceCall,
      lifecycle({
        visits: [
          {
            id: "visit-1",
            organizationId: "org-1",
            serviceCallId: "sc-1",
            technicianId: "tech-1",
            technician: { id: "tech-1", email: "tech@demo", displayName: "Demo Technician" },
            sequence: 1,
            status: "finished",
            drivingStartedAt: "2026-07-16T08:30:00.000Z",
            workingStartedAt: "2026-07-16T09:00:00.000Z",
            finishedAt: "2026-07-16T11:15:00.000Z",
            createdAt: "2026-07-16T08:00:00.000Z",
            updatedAt: "2026-07-16T11:15:00.000Z",
          },
        ],
        timeline: [
          {
            id: "scheduled-1",
            type: "visit.scheduled",
            sequence: 2,
            occurredAt: "2026-07-16T08:05:00.000Z",
            payload: { visitId: "visit-1" },
          },
          {
            id: "departed-1",
            type: "visit.driving_started",
            sequence: 3,
            occurredAt: "2026-07-16T08:30:00.000Z",
            payload: { visitId: "visit-1" },
          },
          {
            id: "working-1",
            type: "visit.working_started",
            sequence: 4,
            occurredAt: "2026-07-16T09:00:00.000Z",
            payload: { visitId: "visit-1" },
          },
          {
            id: "finished-1",
            type: "visit.finished",
            sequence: 5,
            occurredAt: "2026-07-16T11:15:00.000Z",
            payload: { visitId: "visit-1" },
          },
        ],
      }),
      new Map(),
    );

    expect(events.map((event) => event.type)).toEqual([
      "created",
      "technician_dispatched",
      "technician_departed",
      "work_started",
      "visit_finished",
    ]);
    expect(events.slice(1).every((event) => event.technicianName === "Demo Technician")).toBe(true);
  });

  it("includes service call closed with actor name when available", () => {
    const actorNames = new Map([["manager-1", "Demo Service Manager"]]);
    const events = buildServiceCallHistoryTimeline(
      { ...serviceCall, completedAt: "2026-08-04T12:00:00.000Z" },
      lifecycle({
        lifecycleState: "closed",
        timeline: [
          {
            id: "closed-1",
            type: "service_call.closed",
            sequence: 10,
            occurredAt: "2026-08-04T12:00:00.000Z",
            actorId: "manager-1",
            payload: {},
          },
        ],
      }),
      actorNames,
    );

    expect(events.at(-1)).toMatchObject({
      type: "closed",
      occurredAt: "2026-08-04T12:00:00.000Z",
      closedByName: "Demo Service Manager",
    });
  });

  it("resolves creator from lifecycle created transition", () => {
    const actorNames = new Map([["manager-1", "Demo Service Manager"]]);
    const events = buildServiceCallHistoryTimeline(
      serviceCall,
      lifecycle({
        timeline: [
          {
            id: "created-1",
            type: "service_call.lifecycle_changed",
            sequence: 1,
            occurredAt: "2026-07-15T07:15:00.000Z",
            actorId: "manager-1",
            payload: { reason: "created", toLifecycleKey: "waiting_assignment" },
          },
        ],
      }),
      actorNames,
    );

    expect(events[0]).toMatchObject({
      type: "created",
      creatorName: "Demo Service Manager",
    });
  });

  it("orders equal-time activity by immutable workflow sequence", () => {
    const events = buildServiceCallHistoryTimeline(
      {
        openedAt: "2026-07-15T07:15:00.000Z",
        createdAt: "2026-07-15T07:15:00.000Z",
        completedAt: "2026-07-15T07:15:00.000Z",
      },
      lifecycle({
        lifecycleState: "closed",
        visits: [
          {
            id: "visit-1",
            organizationId: "org-1",
            serviceCallId: "sc-1",
            technicianId: "tech-1",
            technician: { id: "tech-1", email: "tech@demo", displayName: "Technician One" },
            sequence: 1,
            status: "finished",
            createdAt: "2026-07-15T07:15:00.000Z",
            updatedAt: "2026-07-15T07:15:00.000Z",
          },
        ],
        timeline: [
          {
            id: "scheduled-1",
            type: "visit.scheduled",
            sequence: 3,
            occurredAt: "2026-07-15T07:15:00.000Z",
            payload: { visitId: "visit-1" },
          },
          {
            id: "closed-1",
            type: "service_call.closed",
            sequence: 8,
            occurredAt: "2026-07-15T07:15:00.000Z",
            payload: {},
          },
        ],
      }),
      new Map(),
    );

    expect(events.map((event) => event.type)).toEqual([
      "created",
      "technician_dispatched",
      "closed",
    ]);
    expect(events.map((event) => event.sequence)).toEqual([0, 3, 8]);
  });
});
