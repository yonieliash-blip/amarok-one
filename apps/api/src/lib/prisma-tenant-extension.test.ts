import { describe, expect, it } from "vitest";
import { runWithTenantContext } from "./tenant-context.js";
import { scopeTenantQueryArgsForTests } from "./prisma-tenant-extension.js";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const visitId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("prisma tenant extension query scoping", () => {
  it("adds tenant scope to a unique id selector on upsert", () => {
    runWithTenantContext({ organizationId }, () => {
      const scoped = scopeTenantQueryArgsForTests("ServiceCallVisit", "upsert", {
        where: { id: visitId },
        create: { organizationId, serviceCallId: visitId, technicianId: visitId, sequence: 1 },
        update: { status: "ASSIGNED" },
      });

      expect(scoped.where).toEqual({ id: visitId, organizationId });
      expect(scoped.create).toMatchObject({ organizationId });
    });
  });

  it("merges organizationId into non-unique upsert where clauses", () => {
    runWithTenantContext({ organizationId }, () => {
      const scoped = scopeTenantQueryArgsForTests("ServiceCallVisit", "upsert", {
        where: { status: "ASSIGNED" },
        create: { organizationId, serviceCallId: visitId, technicianId: visitId, sequence: 1 },
        update: { status: "ASSIGNED" },
      });

      expect(scoped.where).toEqual({
        AND: [{ status: "ASSIGNED" }, { organizationId }],
      });
    });
  });

  it("adds tenant scope to a unique id selector on update", () => {
    runWithTenantContext({ organizationId }, () => {
      const scoped = scopeTenantQueryArgsForTests("ServiceCall", "update", {
        where: { id: visitId },
        data: { lifecycleState: "CLOSED" },
      });

      expect(scoped.where).toEqual({ id: visitId, organizationId });
    });
  });

  it("rejects an explicit cross-tenant unique update", () => {
    runWithTenantContext({ organizationId }, () => {
      expect(() =>
        scopeTenantQueryArgsForTests("ServiceCall", "update", {
          where: {
            id: visitId,
            organizationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          },
          data: { lifecycleState: "CLOSED" },
        }),
      ).toThrow("Cross-tenant write is not allowed for ServiceCall");
    });
  });

  it("rejects an organization update outside the active tenant", () => {
    runWithTenantContext({ organizationId }, () => {
      expect(() =>
        scopeTenantQueryArgsForTests("Organization", "update", {
          where: { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" },
          data: { name: "Other organization" },
        }),
      ).toThrow("Cross-tenant write is not allowed for Organization");
    });
  });

  it("preserves member module compound unique selector on upsert", () => {
    const memberId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    runWithTenantContext({ organizationId }, () => {
      const scoped = scopeTenantQueryArgsForTests("MemberModuleAccess", "upsert", {
        where: {
          organizationMemberId_moduleKey: {
            organizationMemberId: memberId,
            moduleKey: "inventory",
          },
        },
        create: {
          organizationId,
          organizationMemberId: memberId,
          moduleKey: "inventory",
          enabled: true,
        },
        update: { enabled: true },
      });

      expect(scoped.where).toEqual({
        organizationMemberId_moduleKey: {
          organizationMemberId: memberId,
          moduleKey: "inventory",
        },
        organizationId,
      });
      expect(scoped.create).toMatchObject({ organizationId, moduleKey: "inventory" });
    });
  });

  it("preserves organization member compound unique selector on upsert", () => {
    const userId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    runWithTenantContext({ organizationId }, () => {
      const scoped = scopeTenantQueryArgsForTests("OrganizationMember", "upsert", {
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
        create: {
          organizationId,
          userId,
          primaryRoleId: visitId,
        },
        update: { status: "ACTIVE" },
      });

      expect(scoped.where).toEqual({
        organizationId_userId: {
          organizationId,
          userId,
        },
        organizationId,
      });
    });
  });
});
