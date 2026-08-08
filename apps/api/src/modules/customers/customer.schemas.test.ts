import { describe, expect, it } from "vitest";
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from "./customer.schemas.js";

describe("customer.schemas", () => {
  it("accepts valid create payloads", () => {
    const result = createCustomerSchema.safeParse({
      name: "Nordic Lift Services",
      customerNumber: "CUST-001",
      email: "info@example.com",
      status: "active",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid customer numbers", () => {
    const result = createCustomerSchema.safeParse({
      name: "Invalid Customer",
      customerNumber: "cust-001",
    });

    expect(result.success).toBe(false);
  });

  it("requires at least one field on update", () => {
    const result = updateCustomerSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("accepts list query sort parameters", () => {
    const result = listCustomersQuerySchema.safeParse({
      sortBy: "name",
      sortOrder: "asc",
      page: 2,
      pageSize: 25,
    });

    expect(result.success).toBe(true);
  });
});
