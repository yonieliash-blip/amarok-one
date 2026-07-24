import { describe, expect, it } from "vitest";
import { createServiceCallSchema, updateServiceCallSchema } from "./service-call.schemas.js";

const validCustomerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const validEquipmentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("service-call.schemas", () => {
  it("accepts valid create payloads", () => {
    const result = createServiceCallSchema.safeParse({
      serviceCallNumber: "SC-001",
      title: "תקלה במלגזה",
      customerId: validCustomerId,
      equipmentId: validEquipmentId,
      priority: "high",
      status: "open",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid service call numbers", () => {
    const result = createServiceCallSchema.safeParse({
      serviceCallNumber: "sc-001",
      title: "Invalid",
      customerId: validCustomerId,
      equipmentId: validEquipmentId,
    });

    expect(result.success).toBe(false);
  });

  it("requires at least one field on update", () => {
    const result = updateServiceCallSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
