import { describe, expect, it } from "vitest";
import { buildCustomerListWhere } from "./customer-filters.js";

describe("buildCustomerListWhere", () => {
  const organizationId = "11111111-1111-4111-8111-111111111111";

  it("scopes queries to organization and active records", () => {
    const where = buildCustomerListWhere({ organizationId });

    expect(where).toEqual({
      organizationId,
      deletedAt: null,
    });
  });

  it("filters by status when provided", () => {
    const where = buildCustomerListWhere({ organizationId, status: "prospect" });

    expect(where.status).toBe("PROSPECT");
  });

  it("adds case-insensitive search across key fields", () => {
    const where = buildCustomerListWhere({ organizationId, search: "nordic" });

    expect(where.OR).toEqual([
      { name: { contains: "nordic", mode: "insensitive" } },
      { legalName: { contains: "nordic", mode: "insensitive" } },
      { customerNumber: { contains: "nordic", mode: "insensitive" } },
      { email: { contains: "nordic", mode: "insensitive" } },
      { city: { contains: "nordic", mode: "insensitive" } },
    ]);
  });

  it("ignores blank search terms", () => {
    const where = buildCustomerListWhere({ organizationId, search: "   " });

    expect(where.OR).toBeUndefined();
  });
});
