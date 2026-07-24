import { describe, expect, it } from "vitest";
import { createEquipmentSchema, updateEquipmentSchema } from "./equipment.schemas.js";

const validTypeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("equipment.schemas", () => {
  it("accepts valid create payloads", () => {
    const result = createEquipmentSchema.safeParse({
      name: "Toyota 8FGU25 Forklift",
      internalNumber: "EQ-001",
      equipmentTypeId: validTypeId,
      manufacturer: "Toyota",
      model: "8FGU25",
      year: 2019,
      status: "active",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid internal numbers", () => {
    const result = createEquipmentSchema.safeParse({
      name: "Invalid Equipment",
      internalNumber: "eq-001",
      equipmentTypeId: validTypeId,
    });

    expect(result.success).toBe(false);
  });

  it("requires at least one field on update", () => {
    const result = updateEquipmentSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
