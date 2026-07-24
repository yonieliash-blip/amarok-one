import { describe, expect, it } from "vitest";
import {
  buildNavigationItems,
  canAccessPath,
  getDefaultLandingPath,
  getDefaultRolePermissions,
  resolveAuthorizedPath,
} from "@amarok-one/permissions";

describe("web navigation RBAC", () => {
  it("generates warehouse navigation from permissions", () => {
    const items = buildNavigationItems(getDefaultRolePermissions("warehouse-employee"));
    expect(items.map((item) => item.labelKey)).toEqual(
      expect.arrayContaining(["inventory", "purchaseOrders", "parts"]),
    );
  });

  it("blocks technicians from manager routes", () => {
    expect(canAccessPath("/customers", getDefaultRolePermissions("technician"))).toBe(true);
    expect(canAccessPath("/service-calls", getDefaultRolePermissions("technician"))).toBe(false);
    expect(canAccessPath("/my/service-calls", getDefaultRolePermissions("technician"))).toBe(true);
  });

  it("selects technician landing page for authorized home navigation", () => {
    const permissions = getDefaultRolePermissions("technician");
    expect(getDefaultLandingPath(permissions, "technician")).toBe("/my/service-calls");
    expect(resolveAuthorizedPath(permissions, "/", "technician")).toBe("/my/service-calls");
  });
});
