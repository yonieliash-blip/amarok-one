import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  getDefaultLandingPath,
  getDefaultRolePermissions,
  resolveAuthorizedPath,
  ROLE_LANDING_PATHS,
} from "@amarok-one/permissions";

describe("role landing paths", () => {
  it("maps each primary role to its dashboard landing page", () => {
    expect(
      getDefaultLandingPath(
        getDefaultRolePermissions("system-administrator"),
        "system-administrator",
      ),
    ).toBe(ROLE_LANDING_PATHS["system-administrator"]);
    expect(
      getDefaultLandingPath(getDefaultRolePermissions("organization-owner"), "organization-owner"),
    ).toBe(ROLE_LANDING_PATHS["organization-owner"]);
    expect(
      getDefaultLandingPath(getDefaultRolePermissions("service-manager"), "service-manager"),
    ).toBe(ROLE_LANDING_PATHS["service-manager"]);
    expect(getDefaultLandingPath(getDefaultRolePermissions("technician"), "technician")).toBe(
      ROLE_LANDING_PATHS.technician,
    );
    expect(
      getDefaultLandingPath(getDefaultRolePermissions("warehouse-employee"), "warehouse-employee"),
    ).toBe(ROLE_LANDING_PATHS["warehouse-employee"]);
    expect(getDefaultLandingPath(getDefaultRolePermissions("accounting"), "accounting")).toBe(
      ROLE_LANDING_PATHS.accounting,
    );
    expect(getDefaultLandingPath(getDefaultRolePermissions("read-only"), "read-only")).toBe(
      ROLE_LANDING_PATHS["read-only"],
    );
  });

  it("redirects technicians away from management dashboards", () => {
    const permissions = getDefaultRolePermissions("technician");
    expect(resolveAuthorizedPath(permissions, "/", "technician")).toBe("/my/service-calls");
    expect(
      canAccessPath("/dashboard/management", permissions, { activeRoleSlug: "technician" }),
    ).toBe(false);
  });

  it("blocks cross-role dashboard access", () => {
    const managerPermissions = getDefaultRolePermissions("service-manager");
    expect(
      canAccessPath("/dashboard/service", managerPermissions, {
        activeRoleSlug: "service-manager",
      }),
    ).toBe(true);
    expect(
      canAccessPath("/dashboard/executive", managerPermissions, {
        activeRoleSlug: "service-manager",
      }),
    ).toBe(false);
  });
});
