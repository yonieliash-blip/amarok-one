import { describe, expect, it } from "vitest";
import {
  createServiceCallSchema,
  myScheduleQuerySchema,
  updateServiceCallSchema,
} from "./service-call.schemas.js";

const validCustomerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const validEquipmentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("service-call.schemas", () => {
  it("accepts valid create payloads", () => {
    const result = createServiceCallSchema.safeParse({
      title: "תקלה במלגזה",
      customerId: validCustomerId,
      equipmentId: validEquipmentId,
      priority: "high",
      status: "open",
    });

    expect(result.success).toBe(true);
  });

  it("rejects manually supplied service call numbers", () => {
    const result = createServiceCallSchema.safeParse({
      serviceCallNumber: "AM-SE-01",
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

  it("rejects manually supplied service call numbers on update", () => {
    const result = updateServiceCallSchema.safeParse({ serviceCallNumber: "AM-SE-01" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid personal schedule time range", () => {
    const result = myScheduleQuerySchema.safeParse({
      scheduledFrom: "2026-10-01T00:00:00.000Z",
      scheduledTo: "2026-10-02T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a reversed personal schedule time range", () => {
    const result = myScheduleQuerySchema.safeParse({
      scheduledFrom: "2026-10-02T00:00:00.000Z",
      scheduledTo: "2026-10-01T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
