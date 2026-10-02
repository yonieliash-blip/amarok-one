import { describe, expect, it } from "vitest";
import {
  createOrganizationMemberSchema,
  updateMemberBirthDateSchema,
  updateMemberStatusSchema,
} from "./access.schemas.js";

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

  it("accepts an optional ISO birthday and rejects malformed dates", () => {
    expect(updateMemberBirthDateSchema.parse({ birthDate: "1984-06-15" })).toEqual({
      birthDate: "1984-06-15",
    });
    expect(updateMemberBirthDateSchema.parse({ birthDate: null })).toEqual({ birthDate: null });
    expect(() => updateMemberBirthDateSchema.parse({ birthDate: "15/06/1984" })).toThrow();
  });
});
