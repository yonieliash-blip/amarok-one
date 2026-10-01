import { describe, expect, it } from "vitest";
import { createOrganizationMemberSchema, updateMemberStatusSchema } from "./access.schemas.js";

describe("createOrganizationMemberSchema", () => {
  const valid = {
    displayName: "מור לוי",
    email: "mor@example.com",
    initialPassword: "safe-initial-123",
    primaryRoleSlug: "service-coordinator",
    enabledModules: ["core", "service", "office"],
  };

  it("accepts an operational staff member with explicit module access", () => {
    expect(createOrganizationMemberSchema.parse(valid)).toMatchObject(valid);
  });

  it("rejects short passwords and privileged roles", () => {
    expect(() =>
      createOrganizationMemberSchema.parse({ ...valid, initialPassword: "short" }),
    ).toThrow();
    expect(() =>
      createOrganizationMemberSchema.parse({ ...valid, primaryRoleSlug: "system-administrator" }),
    ).toThrow();
  });

  it("only accepts active and suspended member statuses", () => {
    expect(updateMemberStatusSchema.parse({ status: "SUSPENDED" })).toEqual({
      status: "SUSPENDED",
    });
    expect(() => updateMemberStatusSchema.parse({ status: "DELETED" })).toThrow();
  });
});
