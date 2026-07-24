import { describe, expect, it } from "vitest";
import { buildEquipmentListWhere } from "./equipment-filters.js";

describe("buildEquipmentListWhere", () => {
  const organizationId = "11111111-1111-4111-8111-111111111111";

  it("scopes queries to organization and active records", () => {
    const where = buildEquipmentListWhere({ organizationId });

    expect(where).toEqual({
      organizationId,
      deletedAt: null,
    });
  });

  it("filters by status when provided", () => {
    const where = buildEquipmentListWhere({ organizationId, status: "in_service" });

    expect(where.status).toBe("IN_SERVICE");
  });

  it("filters by customer, manufacturer, model, and equipment type", () => {
    const customerId = "22222222-2222-4222-8222-222222222222";
    const equipmentTypeId = "33333333-3333-4333-8333-333333333333";

    const where = buildEquipmentListWhere({
      organizationId,
      customerId,
      manufacturer: "Toyota",
      model: "8FGU25",
      equipmentTypeId,
    });

    expect(where.customerId).toBe(customerId);
    expect(where.manufacturer).toEqual({ equals: "Toyota", mode: "insensitive" });
    expect(where.model).toEqual({ equals: "8FGU25", mode: "insensitive" });
    expect(where.equipmentTypeId).toBe(equipmentTypeId);
  });

  it("adds case-insensitive search across key fields", () => {
    const where = buildEquipmentListWhere({ organizationId, search: "toyota" });

    expect(where.OR).toEqual([
      { name: { contains: "toyota", mode: "insensitive" } },
      { internalNumber: { contains: "toyota", mode: "insensitive" } },
      { serialNumber: { contains: "toyota", mode: "insensitive" } },
      { manufacturer: { contains: "toyota", mode: "insensitive" } },
      { model: { contains: "toyota", mode: "insensitive" } },
      { registrationNumber: { contains: "toyota", mode: "insensitive" } },
      { location: { contains: "toyota", mode: "insensitive" } },
    ]);
  });

  it("ignores blank search terms", () => {
    const where = buildEquipmentListWhere({ organizationId, search: "   " });

    expect(where.OR).toBeUndefined();
  });
});
