import { describe, expect, it } from "vitest";
import {
  buildCustomerListOrderBy,
  DEFAULT_CUSTOMER_SORT_FIELD,
  DEFAULT_CUSTOMER_SORT_ORDER,
} from "./customer-sort.js";

describe("buildCustomerListOrderBy", () => {
  it("defaults to createdAt desc", () => {
    expect(buildCustomerListOrderBy()).toEqual([{ createdAt: "desc" }]);
  });

  it("sorts by name ascending by default when sortBy is name", () => {
    expect(buildCustomerListOrderBy("name")).toEqual([{ name: "asc" }]);
  });

  it("respects explicit sort order", () => {
    expect(buildCustomerListOrderBy("customerNumber", "desc")).toEqual([
      { customerNumber: "desc" },
    ]);
  });

  it("uses configured defaults", () => {
    expect(DEFAULT_CUSTOMER_SORT_FIELD).toBe("createdAt");
    expect(DEFAULT_CUSTOMER_SORT_ORDER).toBe("desc");
  });
});
