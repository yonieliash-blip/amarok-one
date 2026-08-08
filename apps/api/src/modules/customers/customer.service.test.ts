import { beforeEach, describe, expect, it, vi } from "vitest";
import { createContact, getCustomerById, softDeleteCustomer } from "./customer.service.js";

const organizationId = "11111111-1111-4111-8111-111111111111";
const customerId = "22222222-2222-4222-8222-222222222222";
const contactId = "33333333-3333-4333-8333-333333333333";

const customerRecord = {
  id: customerId,
  organizationId,
  name: "Nordic Lift Services",
  legalName: null,
  registrationNumber: null,
  customerNumber: "CUST-001",
  email: "info@example.com",
  phone: null,
  address: null,
  city: "Oslo",
  country: "Norway",
  notes: null,
  status: "ACTIVE" as const,
  createdAt: new Date("2026-07-01T08:00:00.000Z"),
  updatedAt: new Date("2026-07-01T08:00:00.000Z"),
  deletedAt: null,
};

const contactRecord = {
  id: contactId,
  organizationId,
  customerId,
  name: "Jane Doe",
  email: "jane@example.com",
  phone: null,
  jobTitle: "Operations",
  isPrimary: true,
  notes: null,
  createdAt: new Date("2026-07-01T08:00:00.000Z"),
  updatedAt: new Date("2026-07-01T08:00:00.000Z"),
  deletedAt: null,
};

const { transactionMock, customerFindFirstMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  customerFindFirstMock: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    $transaction: transactionMock,
    customer: {
      findFirst: customerFindFirstMock,
      create: vi.fn(),
      update: vi.fn(),
    },
    customerContact: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../organizations/organization.service.js", () => ({
  assertOrganizationExists: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/audit.js", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

describe("customer.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("soft-deletes customer contacts when deleting a customer", async () => {
    customerFindFirstMock.mockResolvedValue(customerRecord);
    transactionMock.mockResolvedValue([{ count: 1 }, customerRecord]);

    await softDeleteCustomer(organizationId, customerId, "actor-1");

    expect(transactionMock).toHaveBeenCalledOnce();
    const operations = transactionMock.mock.calls[0]?.[0];
    expect(Array.isArray(operations)).toBe(true);
    expect(operations).toHaveLength(2);
  });

  it("clears existing primary contacts when creating a primary contact", async () => {
    customerFindFirstMock.mockResolvedValue({ id: customerId });
    transactionMock.mockImplementation(
      async (
        callback: (tx: {
          customerContact: {
            updateMany: ReturnType<typeof vi.fn>;
            create: ReturnType<typeof vi.fn>;
          };
        }) => Promise<unknown>,
      ) => {
        if (typeof callback === "function") {
          const tx = {
            customerContact: {
              updateMany: vi.fn().mockResolvedValue({ count: 1 }),
              create: vi.fn().mockResolvedValue(contactRecord),
            },
          };
          return callback(tx);
        }
        return [];
      },
    );

    const created = await createContact(
      organizationId,
      customerId,
      {
        name: "Jane Doe",
        email: "jane@example.com",
        jobTitle: "Operations",
        isPrimary: true,
      },
      "actor-1",
    );

    expect(created.name).toBe("Jane Doe");
    expect(created.isPrimary).toBe(true);
  });

  it("returns not found when customer is outside tenant scope", async () => {
    customerFindFirstMock.mockResolvedValue(null);

    await expect(getCustomerById(organizationId, customerId)).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
  });
});
