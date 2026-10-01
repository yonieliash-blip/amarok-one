import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyVanInventory } from "./inventory.service.js";

const { findFirst, assertOrganizationExists } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  assertOrganizationExists: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    inventoryLocation: { findFirst },
  },
}));

vi.mock("../organizations/organization.service.js", () => ({ assertOrganizationExists }));

const organizationId = "11111111-1111-4111-8111-111111111111";
const technicianId = "22222222-2222-4222-8222-222222222222";

describe("inventory.service personal van stock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertOrganizationExists.mockResolvedValue(undefined);
  });

  it("scopes personal stock to the active technician's service van", async () => {
    findFirst.mockResolvedValue({
      id: "van-1",
      organizationId,
      name: "ניידת 12",
      type: "SERVICE_VAN",
      assignedUserId: technicianId,
      assignedUser: { displayName: "דני" },
      items: [],
      createdAt: new Date("2026-10-01T00:00:00.000Z"),
      updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    });

    await expect(getMyVanInventory(organizationId, technicianId)).resolves.toMatchObject({
      van: { id: "van-1", name: "ניידת 12", assignedUserId: technicianId, items: [] },
    });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          assignedUserId: technicianId,
          type: "SERVICE_VAN",
          deletedAt: null,
        }),
      }),
    );
  });

  it("returns an empty result when no service van is assigned", async () => {
    findFirst.mockResolvedValue(null);

    await expect(getMyVanInventory(organizationId, technicianId)).resolves.toEqual({});
  });
});
