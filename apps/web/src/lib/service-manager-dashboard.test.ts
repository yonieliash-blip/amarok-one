import { describe, expect, it } from "vitest";
import type { ServiceCall } from "@amarok-one/types";
import {
  countByBucket,
  endOfLocalDay,
  filterDashboardCalls,
  isInProgressServiceCall,
  matchesServiceManagerBucket,
  startOfLocalDay,
} from "./service-manager-dashboard";

function call(partial: Partial<ServiceCall> & Pick<ServiceCall, "id">): ServiceCall {
  return {
    organizationId: "org-1",
    serviceCallNumber: "SC-001",
    title: "Test",
    status: "open",
    lifecycleState: "waiting_assignment",
    priority: "normal",
    openedAt: "2026-07-29T08:00:00.000Z",
    customerId: "cust-1",
    equipmentId: "eq-1",
    createdAt: "2026-07-29T08:00:00.000Z",
    updatedAt: "2026-07-29T08:00:00.000Z",
    ...partial,
  };
}

describe("service manager dashboard buckets", () => {
  const ref = new Date("2026-07-29T12:00:00");
  const dayStart = startOfLocalDay(ref);
  const dayEnd = endOfLocalDay(ref);

  it("classifies waiting assignment and in progress", () => {
    const waiting = call({ id: "1", lifecycleState: "waiting_assignment" });
    const driving = call({ id: "2", lifecycleState: "driving", status: "scheduled" });

    expect(matchesServiceManagerBucket(waiting, "waiting_assignment", dayStart, dayEnd)).toBe(true);
    expect(isInProgressServiceCall(driving)).toBe(true);
    expect(matchesServiceManagerBucket(driving, "in_progress", dayStart, dayEnd)).toBe(true);
  });

  it("counts completed today separately from active queue", () => {
    const active = call({ id: "1", lifecycleState: "working", status: "in_progress" });
    const done = call({
      id: "2",
      lifecycleState: "closed",
      status: "completed",
      completedAt: "2026-07-29T16:00:00.000Z",
    });

    const all = [active, done];
    expect(countByBucket(all, "current", dayStart, dayEnd)).toBe(1);
    expect(countByBucket(all, "completed_today", dayStart, dayEnd)).toBe(1);
  });

  it("filters by search and assignee", () => {
    const rows = [
      call({
        id: "1",
        title: "Hydraulic leak",
        assignedUserId: "tech-1",
        assignedUser: { id: "tech-1", email: "a@x.com", displayName: "Alex" },
      }),
      call({ id: "2", title: "Battery swap" }),
    ];

    const filtered = filterDashboardCalls(rows, {
      bucket: "current",
      todayStart: dayStart,
      todayEnd: dayEnd,
      search: "hydraulic",
      assigneeId: "tech-1",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("1");
  });
});
