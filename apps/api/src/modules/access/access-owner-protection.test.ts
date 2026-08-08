import { describe, expect, it } from "vitest";
import { ORGANIZATION_OWNER_ROLE_SLUG, resolveEffectivePermissions } from "@amarok-one/permissions";

describe("organization owner protection", () => {
  it("grants all tenant permissions to organization owner regardless of module rows", () => {
    const resolved = resolveEffectivePermissions({
      isOrganizationOwner: true,
      primaryRoleSlug: ORGANIZATION_OWNER_ROLE_SLUG,
      primaryRoleIsOwner: true,
      enabledModules: [],
    });

    expect(resolved.isOrganizationOwner).toBe(true);
    expect(resolved.enabledModules).toEqual([
      "core",
      "service",
      "inventory",
      "finance",
      "administration",
    ]);
    expect(resolved.permissions).toContain("users:write");
    expect(resolved.permissions).toContain("service_calls:read");
  });

  it("does not treat system-administrator as owner", () => {
    const resolved = resolveEffectivePermissions({
      isOrganizationOwner: false,
      primaryRoleSlug: "system-administrator",
      primaryRoleIsOwner: false,
      enabledModules: ["core", "administration"],
    });

    expect(resolved.isOrganizationOwner).toBe(false);
    expect(resolved.enabledModules).toEqual(["core", "administration"]);
    expect(resolved.permissions).not.toContain("service_calls:read");
    expect(resolved.permissions).toContain("users:read");
  });

  it("uses enabled modules as authoritative for non-owner members", () => {
    const technician = resolveEffectivePermissions({
      isOrganizationOwner: false,
      primaryRoleSlug: "technician",
      primaryRoleIsOwner: false,
      enabledModules: ["core"],
    });

    expect(technician.permissions).toContain("customers:read");
    expect(technician.permissions).not.toContain("service_calls:read");

    const expanded = resolveEffectivePermissions({
      isOrganizationOwner: false,
      primaryRoleSlug: "technician",
      primaryRoleIsOwner: false,
      enabledModules: ["core", "service"],
    });

    expect(expanded.permissions).toContain("service_calls:read");
  });
});
