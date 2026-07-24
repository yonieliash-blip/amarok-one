import { describe, expect, it } from "vitest";
import { AppError } from "../../lib/errors.js";
import { assertEquipmentMatchesCustomer } from "./service-call-relationship.js";

describe("assertEquipmentMatchesCustomer", () => {
  it("allows equipment without a linked customer", () => {
    expect(() => assertEquipmentMatchesCustomer({ customerId: null }, "cust-1")).not.toThrow();
  });

  it("allows matching customer ids", () => {
    expect(() => assertEquipmentMatchesCustomer({ customerId: "cust-1" }, "cust-1")).not.toThrow();
  });

  it("rejects mismatched customer ids", () => {
    expect(() => assertEquipmentMatchesCustomer({ customerId: "cust-1" }, "cust-2")).toThrow(
      AppError,
    );

    try {
      assertEquipmentMatchesCustomer({ customerId: "cust-1" }, "cust-2");
    } catch (error) {
      expect(error).toMatchObject({
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }
  });
});
