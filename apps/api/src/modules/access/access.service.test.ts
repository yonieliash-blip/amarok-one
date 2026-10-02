import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAccessService } from "./access.service.js";

const organizationId = "11111111-1111-4111-8111-111111111111";
const ownerUserId = "22222222-2222-4222-8222-222222222222";
const technicianMemberId = "33333333-3333-4333-8333-333333333333";

const { findFirst, update, userUpdate, loadOrganizationMember, writeAuditLog } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  userUpdate: vi.fn(),
  loadOrganizationMember: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    organizationMember: { findFirst, update },
    user: { update: userUpdate },
  },
}));

vi.mock("../../lib/member-access.js", () => ({
  bumpMemberPermissionsVersion: vi.fn(),
  countOrganizationOwners: vi.fn(),
  loadOrganizationMember,
  loadOrganizationMemberById: vi.fn(),
  memberInclude: {},
  replaceMemberModuleAccess: vi.fn(),
  resolveMemberAuthorization: vi.fn(),
  getEnabledModuleKeys: vi.fn(),
}));

vi.mock("../../lib/audit.js", () => ({ writeAuditLog }));
vi.mock("../../lib/password.js", () => ({ hashPassword: vi.fn() }));

const ownerMember = {
  id: "owner-member",
  userId: ownerUserId,
  isOrganizationOwner: true,
  primaryRole: { isOwner: true, slug: "organization-owner" },
};

const technicianMember = {
  id: technicianMemberId,
  userId: "44444444-4444-4444-8444-444444444444",
  isOrganizationOwner: false,
  status: "ACTIVE",
  permissionsVersion: 4,
  primaryRole: { isOwner: false, slug: "technician" },
  user: { displayName: "Daniel Eliash" },
};

describe("access.service member status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadOrganizationMember.mockResolvedValue(ownerMember);
    writeAuditLog.mockResolvedValue(undefined);
  });

  it("suspends a non-owner member, invalidates their session version, and audits the change", async () => {
    findFirst.mockResolvedValue(technicianMember);
    update.mockResolvedValue({ status: "SUSPENDED", permissionsVersion: 5 });

    const result = await createAccessService().updateMemberStatus(
      organizationId,
      technicianMemberId,
      ownerUserId,
      { status: "SUSPENDED" },
    );

    expect(result).toEqual({
      id: technicianMemberId,
      status: "SUSPENDED",
      permissionsVersion: 5,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: technicianMemberId },
      data: { status: "SUSPENDED", permissionsVersion: { increment: 1 } },
      select: { status: true, permissionsVersion: true },
    });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "member.suspended",
        organizationId,
        entityId: technicianMemberId,
      }),
    );
  });

  it("never permits an organization owner account to be suspended", async () => {
    findFirst.mockResolvedValue({ ...ownerMember, status: "ACTIVE", permissionsVersion: 1 });

    await expect(
      createAccessService().updateMemberStatus(organizationId, ownerMember.id, ownerUserId, {
        status: "SUSPENDED",
      }),
    ).rejects.toThrow("cannot be suspended");

    expect(update).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("updates an employee display name and audits the change", async () => {
    findFirst.mockResolvedValue(technicianMember);
    userUpdate.mockResolvedValue({ displayName: "דניאל אליאש" });

    const result = await createAccessService().updateMemberDisplayName(
      organizationId,
      technicianMemberId,
      ownerUserId,
      { displayName: "דניאל אליאש" },
    );

    expect(result).toEqual({ id: technicianMemberId, displayName: "דניאל אליאש" });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: technicianMember.userId },
      data: { displayName: "דניאל אליאש" },
      select: { displayName: true },
    });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "member.display_name_updated",
        entityId: technicianMemberId,
      }),
    );
  });
});
