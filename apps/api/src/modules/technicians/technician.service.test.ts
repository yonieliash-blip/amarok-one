import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTechnician, listTechnicians } from "./technician.service.js";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  actorFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  roleFindFirst: vi.fn(),
  transaction: vi.fn(),
  txUserCreate: vi.fn(),
  txUserRoleCreate: vi.fn(),
  txMemberCreate: vi.fn(),
  txModuleCreate: vi.fn(),
  txAuditCreate: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    organizationMember: {
      findMany: mocks.findMany,
      findFirst: mocks.actorFindFirst,
    },
    user: { findUnique: mocks.userFindUnique },
    role: { findFirst: mocks.roleFindFirst },
    $transaction: mocks.transaction,
  },
}));

vi.mock("../../lib/password.js", () => ({
  hashPassword: mocks.hashPassword,
}));

describe("technician.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes the roster to the active organization and technician role", async () => {
    mocks.findMany.mockResolvedValue([]);
    await listTechnicians("11111111-1111-4111-8111-111111111111");

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "11111111-1111-4111-8111-111111111111",
          deletedAt: null,
          primaryRole: { slug: "technician", deletedAt: null },
        }),
      }),
    );
  });

  it("marks suspended members as inactive", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "member-1",
        userId: "user-1",
        status: "SUSPENDED",
        user: { displayName: "Dana", email: "dana@example.com", isActive: true },
        primaryRole: { id: "role-1", slug: "technician", name: "Technician" },
      },
    ]);

    await expect(
      listTechnicians("11111111-1111-4111-8111-111111111111"),
    ).resolves.toMatchObject([
      { displayName: "Dana", isActive: false, status: "SUSPENDED" },
    ]);
  });

  it("allows only the organization owner to create a technician", async () => {
    mocks.actorFindFirst.mockResolvedValue({
      isOrganizationOwner: false,
      primaryRole: { isOwner: false },
    });

    await expect(
      createTechnician(
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        {
          displayName: "Daniel",
          email: "daniel@example.com",
          password: "StrongPass123",
        },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not silently attach an existing global user", async () => {
    mocks.actorFindFirst.mockResolvedValue({
      isOrganizationOwner: true,
      primaryRole: { isOwner: true },
    });
    mocks.userFindUnique.mockResolvedValue({ id: "existing-user" });

    await expect(
      createTechnician(
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        {
          displayName: "Daniel",
          email: "daniel@example.com",
          password: "StrongPass123",
        },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates the technician membership, role, core access and audit record atomically", async () => {
    const organizationId = "11111111-1111-4111-8111-111111111111";
    const actorUserId = "22222222-2222-4222-8222-222222222222";

    mocks.actorFindFirst.mockResolvedValue({
      isOrganizationOwner: true,
      primaryRole: { isOwner: true },
    });
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.roleFindFirst.mockResolvedValue({
      id: "role-1",
      slug: "technician",
      name: "Technician",
    });
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.txUserCreate.mockResolvedValue({
      id: "user-1",
      email: "daniel@example.com",
      displayName: "Daniel",
      isActive: true,
    });
    mocks.txUserRoleCreate.mockResolvedValue({ id: "user-role-1" });
    mocks.txMemberCreate.mockResolvedValue({
      id: "member-1",
      status: "ACTIVE",
    });
    mocks.txModuleCreate.mockResolvedValue({ id: "module-1" });
    mocks.txAuditCreate.mockResolvedValue({ id: "audit-1" });

    type TransactionClient = {
      user: { create: typeof mocks.txUserCreate };
      userRole: { create: typeof mocks.txUserRoleCreate };
      organizationMember: { create: typeof mocks.txMemberCreate };
      memberModuleAccess: { create: typeof mocks.txModuleCreate };
      auditLog: { create: typeof mocks.txAuditCreate };
    };

    const tx: TransactionClient = {
      user: { create: mocks.txUserCreate },
      userRole: { create: mocks.txUserRoleCreate },
      organizationMember: { create: mocks.txMemberCreate },
      memberModuleAccess: { create: mocks.txModuleCreate },
      auditLog: { create: mocks.txAuditCreate },
    };

    mocks.transaction.mockImplementation(
      async (callback: (client: TransactionClient) => Promise<unknown>) => callback(tx),
    );

    const result = await createTechnician(organizationId, actorUserId, {
      displayName: " Daniel ",
      email: "DANIEL@EXAMPLE.COM ",
      password: "StrongPass123",
    });

    expect(mocks.hashPassword).toHaveBeenCalledWith("StrongPass123");
    expect(mocks.txUserCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "daniel@example.com",
        displayName: "Daniel",
        passwordHash: "hashed-password",
      }),
    });
    expect(mocks.txModuleCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        organizationMemberId: "member-1",
        moduleKey: "core",
        enabled: true,
      }),
    });
    expect(mocks.txAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        actorId: actorUserId,
        action: "technician.created",
        entityId: "member-1",
      }),
    });
    expect(result).toMatchObject({
      id: "member-1",
      userId: "user-1",
      email: "daniel@example.com",
      isActive: true,
      role: { slug: "technician" },
    });
    expect(result).not.toHaveProperty("password");
  });
});
