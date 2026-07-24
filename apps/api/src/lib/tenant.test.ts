import { describe, expect, it } from "vitest";
import { AppError } from "./errors.js";
import { assertTenantOrganization } from "./tenant.js";

describe("assertTenantOrganization", () => {
  const authOrganizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  it("allows access when organization matches JWT tenant", () => {
    expect(() => assertTenantOrganization(authOrganizationId, authOrganizationId)).not.toThrow();
  });

  it("denies cross-tenant access", () => {
    const otherOrganizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

    expect(() => assertTenantOrganization(otherOrganizationId, authOrganizationId)).toThrow(
      AppError,
    );

    try {
      assertTenantOrganization(otherOrganizationId, authOrganizationId);
    } catch (error) {
      expect(error).toMatchObject({
        code: "FORBIDDEN",
        status: 403,
        message: "Access denied for this organization",
      });
    }
  });
});
