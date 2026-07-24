import { describe, expect, it } from "vitest";
import { buildServiceCallListWhere } from "./service-call-filters.js";

describe("buildServiceCallListWhere", () => {
  const organizationId = "11111111-1111-4111-8111-111111111111";

  it("scopes queries to organization and active records", () => {
    const where = buildServiceCallListWhere({ organizationId });

    expect(where).toEqual({
      organizationId,
      deletedAt: null,
    });
  });

  it("filters by status, priority, customer, equipment and assignee", () => {
    const where = buildServiceCallListWhere({
      organizationId,
      status: "in_progress",
      priority: "high",
      customerId: "22222222-2222-4222-8222-222222222222",
      equipmentId: "33333333-3333-4333-8333-333333333333",
      assignedUserId: "44444444-4444-4444-8444-444444444444",
    });

    expect(where.status).toBe("IN_PROGRESS");
    expect(where.priority).toBe("HIGH");
    expect(where.customerId).toBe("22222222-2222-4222-8222-222222222222");
    expect(where.equipmentId).toBe("33333333-3333-4333-8333-333333333333");
    expect(where.assignedUserId).toBe("44444444-4444-4444-8444-444444444444");
  });

  it("filters by opened date range", () => {
    const where = buildServiceCallListWhere({
      organizationId,
      openedFrom: "2026-07-01T00:00:00.000Z",
      openedTo: "2026-07-31T23:59:59.999Z",
    });

    expect(where.openedAt).toEqual({
      gte: new Date("2026-07-01T00:00:00.000Z"),
      lte: new Date("2026-07-31T23:59:59.999Z"),
    });
  });

  it("adds case-insensitive search across key fields", () => {
    const where = buildServiceCallListWhere({ organizationId, search: "מלגזה" });

    expect(where.OR).toEqual([
      { title: { contains: "מלגזה", mode: "insensitive" } },
      { serviceCallNumber: { contains: "מלגזה", mode: "insensitive" } },
      { description: { contains: "מלגזה", mode: "insensitive" } },
      { contactName: { contains: "מלגזה", mode: "insensitive" } },
      { location: { contains: "מלגזה", mode: "insensitive" } },
    ]);
  });
});
