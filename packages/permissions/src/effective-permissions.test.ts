import { describe, expect, it } from "vitest";
import { PERMISSIONS, TENANT_PERMISSION_SLUGS } from "./permissions.js";
import {
  ORGANIZATION_OWNER_ROLE_SLUG,
  resolveEffectivePermissions,
} from "./effective-permissions.js";
import { expandModulePermissions } from "./modules.js";

describe("resolveEffectivePermissions", () => {
  it("grants all tenant permissions to organization owner regardless of modules", () => {
    const result = resolveEffectivePermissions({
      isOrganizationOwner: true,
      primaryRoleSlug: ORGANIZATION_OWNER_ROLE_SLUG,
      primaryRoleIsOwner: true,
      enabledModules: ["core"],
    });

    expect(result.isOrganizationOwner).toBe(true);
    expect(result.permissions).toEqual(TENANT_PERMISSION_SLUGS);
    expect(result.enabledModules).toHaveLength(5);
  });

  it("grants service + inventory combination without role proliferation", () => {
    const result = resolveEffectivePermissions({
      isOrganizationOwner: false,
      primaryRoleSlug: "service-manager",
      primaryRoleIsOwner: false,
      enabledModules: ["core", "service", "inventory"],
    });

    expect(result.permissions).toContain(PERMISSIONS.SERVICE_CALLS_READ);
    expect(result.permissions).toContain(PERMISSIONS.INVENTORY_READ);
    expect(result.permissions).not.toContain(PERMISSIONS.ACCOUNTING_READ);
  });

  it("grants finance + inventory combination", () => {
    const result = resolveEffectivePermissions({
      isOrganizationOwner: false,
      primaryRoleSlug: "accounting",
      primaryRoleIsOwner: false,
      enabledModules: ["core", "finance", "inventory"],
    });

    expect(result.permissions).toContain(PERMISSIONS.ACCOUNTING_READ);
    expect(result.permissions).toContain(PERMISSIONS.INVENTORY_READ);
    expect(result.permissions).not.toContain(PERMISSIONS.SERVICE_CALLS_READ);
  });

  it("does not grant owner protection to system-administrator without owner flag", () => {
    const result = resolveEffectivePermissions({
      isOrganizationOwner: false,
      primaryRoleSlug: "system-administrator",
      primaryRoleIsOwner: false,
      enabledModules: ["core"],
    });

    expect(result.isOrganizationOwner).toBe(false);
    expect(result.permissions).toEqual(expandModulePermissions("core"));
  });

  it("technician with core module gets field permissions only", () => {
    const result = resolveEffectivePermissions({
      isOrganizationOwner: false,
      primaryRoleSlug: "technician",
      primaryRoleIsOwner: false,
      enabledModules: ["core"],
    });

    expect(result.permissions).toContain(PERMISSIONS.MY_SERVICE_CALLS_READ);
    expect(result.permissions).not.toContain(PERMISSIONS.SERVICE_CALLS_READ);
  });
});
