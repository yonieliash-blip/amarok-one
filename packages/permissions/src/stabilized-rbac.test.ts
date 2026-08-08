import { describe, expect, it } from "vitest";
import { canAccessPath, getDefaultLandingPath, ROLE_LANDING_PATHS } from "@amarok-one/permissions";

import { resolveEffectivePermissions } from "./effective-permissions.js";

const STABILIZED_ROLES = [
  ["system-administrator", "/dashboard/management"],
  ["organization-owner", "/dashboard/executive"],
  ["service-manager", "/dashboard/service"],
  ["technician", "/my/service-calls"],
  ["warehouse-employee", "/dashboard/warehouse"],
  ["accounting", "/dashboard/accounting"],
] as const;

describe("stabilized role landings", () => {
  it.each(STABILIZED_ROLES)("lands %s on %s", (roleSlug, landingPath) => {
    const modules =
      roleSlug === "technician"
        ? ["core"]
        : ["core", "service", "inventory", "finance", "administration"];
    const { permissions } = resolveEffectivePermissions({
      isOrganizationOwner: roleSlug === "organization-owner",
      primaryRoleSlug: roleSlug,
      primaryRoleIsOwner: roleSlug === "organization-owner",
      enabledModules: modules,
    });
    expect(getDefaultLandingPath(permissions, roleSlug)).toBe(landingPath);
    expect(ROLE_LANDING_PATHS[roleSlug]).toBe(landingPath);
    expect(canAccessPath(landingPath, permissions, { activeRoleSlug: roleSlug })).toBe(true);
  });

  it.each(STABILIZED_ROLES)("blocks %s from other role dashboards", (roleSlug) => {
    const modules =
      roleSlug === "technician"
        ? ["core"]
        : ["core", "service", "inventory", "finance", "administration"];
    const { permissions } = resolveEffectivePermissions({
      isOrganizationOwner: roleSlug === "organization-owner",
      primaryRoleSlug: roleSlug,
      primaryRoleIsOwner: roleSlug === "organization-owner",
      enabledModules: modules,
    });
    const foreignDashboards = STABILIZED_ROLES.filter(([slug]) => slug !== roleSlug).map(
      ([, path]) => path,
    );

    for (const foreignPath of foreignDashboards) {
      if (!foreignPath.startsWith("/dashboard/")) {
        continue;
      }

      expect(canAccessPath(foreignPath, permissions, { activeRoleSlug: roleSlug })).toBe(false);
    }
  });

  it("returns unauthorized when a known role cannot access its landing page", () => {
    expect(getDefaultLandingPath([], "technician")).toBe("/unauthorized");
  });
});
