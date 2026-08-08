import { describe, expect, it } from "vitest";
import {
  canReadServiceCalls,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isAssignedServiceCallsOnly,
  mergePermissionSlugs,
} from "./engine.js";
import { PERMISSIONS } from "./permissions.js";
import { getDefaultRolePermissions } from "./roles.js";
import {
  buildNavigationItems,
  getDefaultLandingPath,
  resolveAuthorizedPath,
} from "./navigation.js";
import { canAccessPath } from "./routes.js";

describe("permission engine", () => {
  it("merges permissions from multiple roles without duplicates", () => {
    const merged = mergePermissionSlugs([
      getDefaultRolePermissions("technician"),
      ["customers:write" as const],
    ]);

    expect(merged).toContain(PERMISSIONS.MY_SERVICE_CALLS_READ);
    expect(merged).toContain("customers:write");
    expect(new Set(merged).size).toBe(merged.length);
  });

  it("evaluates any/all permission checks", () => {
    const granted = [PERMISSIONS.MY_SERVICE_CALLS_READ, PERMISSIONS.SERVICE_CALLS_WRITE];

    expect(
      hasAnyPermission(granted, [
        PERMISSIONS.SERVICE_CALLS_READ,
        PERMISSIONS.MY_SERVICE_CALLS_READ,
      ]),
    ).toBe(true);
    expect(
      hasAllPermissions(granted, [
        PERMISSIONS.MY_SERVICE_CALLS_READ,
        PERMISSIONS.SERVICE_CALLS_WRITE,
      ]),
    ).toBe(true);
    expect(hasPermission(granted, PERMISSIONS.CUSTOMERS_READ)).toBe(false);
  });

  it("detects assigned-only service call access", () => {
    expect(
      isAssignedServiceCallsOnly([
        PERMISSIONS.MY_SERVICE_CALLS_READ,
        PERMISSIONS.SERVICE_CALLS_WRITE,
      ]),
    ).toBe(true);
    expect(
      isAssignedServiceCallsOnly([PERMISSIONS.SERVICE_CALLS_READ, PERMISSIONS.SERVICE_CALLS_WRITE]),
    ).toBe(false);
  });

  it("allows service call read through either global or assigned permission", () => {
    expect(canReadServiceCalls([PERMISSIONS.MY_SERVICE_CALLS_READ])).toBe(true);
    expect(canReadServiceCalls([PERMISSIONS.SERVICE_CALLS_READ])).toBe(true);
    expect(canReadServiceCalls([PERMISSIONS.CUSTOMERS_READ])).toBe(false);
  });
});

describe("default role permissions", () => {
  it("grants administrators every permission", () => {
    const adminPermissions = getDefaultRolePermissions("system-administrator");
    expect(adminPermissions.length).toBeGreaterThan(20);
    expect(adminPermissions).toContain(PERMISSIONS.ROLES_WRITE);
  });

  it("scopes technician navigation permissions", () => {
    const technicianPermissions = getDefaultRolePermissions("technician");
    expect(technicianPermissions).toContain(PERMISSIONS.MY_SERVICE_CALLS_READ);
    expect(technicianPermissions).not.toContain(PERMISSIONS.SERVICE_CALLS_READ);
  });

  it("scopes warehouse employee to inventory modules", () => {
    const warehousePermissions = getDefaultRolePermissions("warehouse-employee");
    expect(warehousePermissions).toContain(PERMISSIONS.INVENTORY_READ);
    expect(warehousePermissions).not.toContain(PERMISSIONS.SERVICE_CALLS_READ);
  });
});

describe("navigation generation", () => {
  it("builds manager navigation from permissions", () => {
    const items = buildNavigationItems(
      getDefaultRolePermissions("service-manager"),
      "service-manager",
    );
    const labels = items.map((item) => item.labelKey);

    expect(labels).toContain("serviceDashboard");
    expect(labels).toContain("serviceCalls");
    expect(labels).toContain("customers");
    expect(labels).not.toContain("myServiceCalls");
  });

  it("builds technician navigation from permissions", () => {
    const items = buildNavigationItems(getDefaultRolePermissions("technician"), "technician");
    const labels = items.map((item) => item.labelKey);

    expect(labels).toContain("myServiceCalls");
    expect(labels).toContain("myEquipment");
    expect(labels).not.toContain("serviceCalls");
    expect(labels).not.toContain("serviceDashboard");
  });

  it("returns unauthorized landing when no permissions match", () => {
    expect(getDefaultLandingPath([])).toBe("/unauthorized");
  });

  it("selects role-appropriate default landing paths", () => {
    expect(getDefaultLandingPath(getDefaultRolePermissions("technician"), "technician")).toBe(
      "/my/service-calls",
    );
    expect(
      getDefaultLandingPath(getDefaultRolePermissions("service-manager"), "service-manager"),
    ).toBe("/dashboard/service");
    expect(
      getDefaultLandingPath(getDefaultRolePermissions("warehouse-employee"), "warehouse-employee"),
    ).toBe("/dashboard/warehouse");
    expect(getDefaultLandingPath(getDefaultRolePermissions("accounting"), "accounting")).toBe(
      "/dashboard/accounting",
    );
    expect(
      getDefaultLandingPath(getDefaultRolePermissions("organization-owner"), "organization-owner"),
    ).toBe("/dashboard/executive");
  });

  it("avoids redirecting to forbidden preferred paths", () => {
    const technicianPermissions = getDefaultRolePermissions("technician");

    expect(resolveAuthorizedPath(technicianPermissions, "/", "technician")).toBe(
      "/my/service-calls",
    );
    expect(resolveAuthorizedPath(technicianPermissions, "/service-calls", "technician")).toBe(
      "/my/service-calls",
    );
    expect(resolveAuthorizedPath(technicianPermissions, "/my/service-calls", "technician")).toBe(
      "/my/service-calls",
    );
    expect(resolveAuthorizedPath(technicianPermissions, "/customers", "technician")).toBe(
      "/customers",
    );
  });

  it("honors authorized preferred paths for managers", () => {
    const managerPermissions = getDefaultRolePermissions("service-manager");

    expect(resolveAuthorizedPath(managerPermissions, "/service-calls", "service-manager")).toBe(
      "/service-calls",
    );
    expect(resolveAuthorizedPath(managerPermissions, "/", "service-manager")).toBe(
      "/dashboard/service",
    );
  });
});

describe("route access", () => {
  it("allows technicians to open assigned service call details", () => {
    expect(canAccessPath("/service-calls/abc-123", getDefaultRolePermissions("technician"))).toBe(
      true,
    );
  });

  it("blocks technicians from the full service calls list", () => {
    expect(canAccessPath("/service-calls", getDefaultRolePermissions("technician"))).toBe(false);
  });

  it("blocks write routes without write permissions", () => {
    expect(
      canAccessPath("/customers/new", getDefaultRolePermissions("read-only"), {
        requireWrite: true,
      }),
    ).toBe(false);
  });
});
