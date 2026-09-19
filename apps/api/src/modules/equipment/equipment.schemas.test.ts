import { describe, expect, it } from "vitest";
import {
  createEquipmentCatalogModelSchema,
  createEquipmentManufacturerSchema,
  createEquipmentSchema,
  createEquipmentTypeSchema,
  updateEquipmentSchema,
} from "./equipment.schemas.js";

const validTypeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const validManufacturerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

  it("accepts catalog type, manufacturer, and model payloads", () => {
    expect(createEquipmentTypeSchema.safeParse({ name: "באגר" }).success).toBe(true);
    expect(createEquipmentManufacturerSchema.safeParse({ name: "קטרפילר" }).success).toBe(true);
    expect(
      createEquipmentCatalogModelSchema.safeParse({
        name: "320 GC",
        equipmentManufacturerId: validManufacturerId,
        equipmentTypeId: validTypeId,
      }).success,
    ).toBe(true);
  });

  it("rejects catalog models without valid catalog relationships", () => {
    expect(
      createEquipmentCatalogModelSchema.safeParse({
        name: "320 GC",
        equipmentManufacturerId: "not-a-uuid",
        equipmentTypeId: validTypeId,
      }).success,
    ).toBe(false);
  });
});
