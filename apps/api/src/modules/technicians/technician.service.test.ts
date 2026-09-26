import { beforeEach, describe, expect, it, vi } from "vitest";
import { listTechnicians } from "./technician.service.js";

const { findMany, inventoryFindMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
  inventoryFindMany: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    organizationMember: { findMany },
    inventoryLocation: { findMany: inventoryFindMany },
  },
}));

describe("technician.service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scopes the roster to the active organization and technician role", async () => {
    findMany.mockResolvedValue([]);
    inventoryFindMany.mockResolvedValue([]);
    await listTechnicians("11111111-1111-4111-8111-111111111111");

    expect(findMany).toHaveBeenCalledWith(
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
    inventoryFindMany.mockResolvedValue([]);
    findMany.mockResolvedValue([
      {
        id: "member-1",
        userId: "user-1",
        status: "SUSPENDED",
        user: { displayName: "Dana", email: "dana@example.com", isActive: true },
        primaryRole: { id: "role-1", slug: "technician", name: "Technician" },
      },
    ]);

    await expect(listTechnicians("11111111-1111-4111-8111-111111111111")).resolves.toMatchObject([
      { displayName: "Dana", isActive: false, status: "SUSPENDED" },
    ]);
  });

  it("includes the assigned service van for the technician", async () => {
    inventoryFindMany.mockResolvedValue([
      { id: "van-1", name: "ניידת 1", assignedUserId: "user-1" },
    ]);
    findMany.mockResolvedValue([
      {
        id: "member-1",
        userId: "user-1",
        status: "ACTIVE",
        user: { displayName: "Dana", email: "dana@example.com", isActive: true },
        primaryRole: { id: "role-1", slug: "technician", name: "Technician" },
      },
    ]);

    await expect(listTechnicians("11111111-1111-4111-8111-111111111111")).resolves.toMatchObject([
      { assignedVan: { id: "van-1", name: "ניידת 1" } },
    ]);
  });
});
