import { describe, expect, it } from "vitest";
import type { ServiceCall } from "@amarok-one/types";
import { groupTechnicianServiceCalls } from "./service-call-groups";

function call(partial: Partial<ServiceCall> & Pick<ServiceCall, "id" | "status">): ServiceCall {
  return {
    serviceCallNumber: "SC-001",
    title: "Test call",
    priority: "normal",
    openedAt: "2026-07-19T08:00:00.000Z",
    customerId: "customer-1",
    equipmentId: "equipment-1",
    organizationId: "org-1",
    ...partial,
  } as ServiceCall;
}

describe("groupTechnicianServiceCalls", () => {
  const now = new Date("2026-07-19T12:00:00.000Z");

  it("groups active calls into today and upcoming sections", () => {
    const grouped = groupTechnicianServiceCalls(
      [
        call({
          id: "today-1",
          status: "scheduled",
          scheduledAt: "2026-07-19T14:00:00.000Z",
        }),
        call({
          id: "upcoming-1",
          status: "open",
          openedAt: "2026-07-15T09:00:00.000Z",
          scheduledAt: "2026-07-21T09:00:00.000Z",
        }),
        call({
          id: "completed-1",
          status: "completed",
          completedAt: "2026-07-18T16:00:00.000Z",
        }),
      ],
      now,
    );

    expect(grouped.today.map((entry) => entry.id)).toEqual(["today-1"]);
    expect(grouped.upcoming.map((entry) => entry.id)).toEqual(["upcoming-1"]);
    expect(grouped.completed.map((entry) => entry.id)).toEqual(["completed-1"]);
  });

  it("treats in-progress calls without a schedule as today", () => {
    const grouped = groupTechnicianServiceCalls(
      [call({ id: "active-1", status: "in_progress", openedAt: "2026-07-10T08:00:00.000Z" })],
      now,
    );

    expect(grouped.today.map((entry) => entry.id)).toEqual(["active-1"]);
    expect(grouped.upcoming).toHaveLength(0);
  });
});
