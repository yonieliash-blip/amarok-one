import { describe, expect, it, vi } from "vitest";
import { createMorningCustomerSyncService } from "./morning-customer-sync.service.js";

const organizationId = "11111111-1111-4111-8111-111111111111";
const customerId = "22222222-2222-4222-8222-222222222222";
const contactId = "33333333-3333-4333-8333-333333333333";

const { customerFindFirstMock, customerUpdateMock, contactFindFirstMock, contactUpdateMock } =
  vi.hoisted(() => ({
    customerFindFirstMock: vi.fn(),
    customerUpdateMock: vi.fn(),
    contactFindFirstMock: vi.fn(),
    contactUpdateMock: vi.fn(),
  }));

vi.mock("../../env.js", () => ({
  env: {
    MORNING_CLIENT_ID: undefined,
    MORNING_CLIENT_SECRET: undefined,
    MORNING_TOKEN_URL: "https://auth.example.test/token",
    MORNING_API_BASE_URL: "https://api.example.test/v1",
  },
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    $transaction: async (callback: (transaction: unknown) => Promise<unknown>) =>
      callback({
        customer: {
          findFirst: customerFindFirstMock,
          update: customerUpdateMock,
          create: vi.fn(),
        },
        customerContact: {
          findFirst: contactFindFirstMock,
          update: contactUpdateMock,
          create: vi.fn(),
        },
      }),
  },
}));

vi.mock("../../lib/audit.js", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe("Morning customer sync", () => {
  it("reactivates a previously soft-deleted Morning customer and contact", async () => {
    customerFindFirstMock.mockResolvedValue({ id: customerId });
    customerUpdateMock.mockResolvedValue({ id: customerId });
    contactFindFirstMock.mockResolvedValue({ id: contactId });
    contactUpdateMock.mockResolvedValue({ id: contactId });

    const service = createMorningCustomerSyncService({
      listClients: async () => [
        {
          id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
          name: "לקוח לדוגמה",
          contactPerson: "איש קשר",
        },
      ],
    });

    await expect(service.syncCustomers(organizationId, "actor-1")).resolves.toEqual({
      total: 1,
      created: 0,
      updated: 1,
      contactsCreated: 0,
      contactsUpdated: 1,
      skipped: 0,
    });

    expect(customerFindFirstMock).toHaveBeenCalledWith({
      where: {
        organizationId,
        morningClientId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      },
      select: { id: true },
    });
    expect(customerUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: null }) }),
    );
    expect(contactUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: null }) }),
    );
  });
});
