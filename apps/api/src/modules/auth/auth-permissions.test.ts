import { describe, expect, it } from "vitest";
import { mergePermissionSlugs } from "@amarok-one/permissions";
import { getDefaultRolePermissions } from "@amarok-one/permissions";

describe("RBAC permission merge", () => {
  it("merges permissions from multiple roles without duplicates", () => {
    const merged = mergePermissionSlugs([
      getDefaultRolePermissions("technician"),
      getDefaultRolePermissions("read-only"),
    ]);

    expect(merged).toContain("my_service_calls:read");
    expect(merged).toContain("customers:read");
    expect(new Set(merged).size).toBe(merged.length);
  });

  it("expands manager permissions with coordinator capabilities when both roles assigned", () => {
    const merged = mergePermissionSlugs([
      getDefaultRolePermissions("service-manager"),
      getDefaultRolePermissions("service-coordinator"),
    ]);

    expect(merged).toContain("service_calls:write");
    expect(merged).toContain("calendar:read");
    expect(merged).toContain("technicians:read");
  });
});
