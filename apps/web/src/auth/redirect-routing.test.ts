import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  getDefaultLandingPath,
  getDefaultRolePermissions,
  resolveAuthorizedPath,
} from "@amarok-one/permissions";

describe("post-login routing", () => {
  it("redirects technicians to my service calls instead of dashboards", () => {
    const permissions = getDefaultRolePermissions("technician");

    expect(getDefaultLandingPath(permissions, "technician")).toBe("/my/service-calls");
    expect(resolveAuthorizedPath(permissions, "/", "technician")).toBe("/my/service-calls");
    expect(canAccessPath("/", permissions, { activeRoleSlug: "technician" })).toBe(false);
  });

  it("redirects managers to the service dashboard", () => {
    const permissions = getDefaultRolePermissions("service-manager");

    expect(getDefaultLandingPath(permissions, "service-manager")).toBe("/dashboard/service");
    expect(resolveAuthorizedPath(permissions, undefined, "service-manager")).toBe(
      "/dashboard/service",
    );
    expect(
      canAccessPath("/service-calls", permissions, { activeRoleSlug: "service-manager" }),
    ).toBe(true);
  });

  it("routes unauthorized home button to an authorized landing page", () => {
    const technicianPermissions = getDefaultRolePermissions("technician");
    const homePath = getDefaultLandingPath(technicianPermissions, "technician");

    expect(homePath).toBe("/my/service-calls");
    expect(canAccessPath(homePath, technicianPermissions, { activeRoleSlug: "technician" })).toBe(
      true,
    );
  });

  it("blocks technicians from management routes while allowing assigned detail pages", () => {
    const permissions = getDefaultRolePermissions("technician");

    expect(canAccessPath("/service-calls", permissions, { activeRoleSlug: "technician" })).toBe(
      false,
    );
    expect(
      canAccessPath("/service-calls/new", permissions, {
        requireWrite: true,
        activeRoleSlug: "technician",
      }),
    ).toBe(false);
    expect(
      canAccessPath("/service-calls/abc-123", permissions, { activeRoleSlug: "technician" }),
    ).toBe(true);
    expect(
      canAccessPath("/service-calls/abc-123/edit", permissions, {
        requireWrite: true,
        activeRoleSlug: "technician",
      }),
    ).toBe(false);
  });
});

describe("logout navigation contract", () => {
  it("uses login as the only public destination after sign-out", () => {
    expect(resolveAuthorizedPath([], "/login")).toBe("/unauthorized");
    expect(canAccessPath("/login", [])).toBe(true);
  });
});
