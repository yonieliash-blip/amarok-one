import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitForReview } from "./document-case.service.js";

const mocks = vi.hoisted(() => ({ documentCaseFindFirst: vi.fn() }));

vi.mock("../../lib/prisma.js", () => ({
  prisma: { documentCase: { findFirst: mocks.documentCaseFindFirst } },
}));

const organizationId = "11111111-1111-4111-8111-111111111111";
const caseId = "22222222-2222-4222-8222-222222222222";
const invoiceVersionId = "33333333-3333-4333-8333-333333333333";

function caseWaitingForInvoiceReview() {
  return {
    id: caseId,
    organizationId,
    repairReportNumber: "R-2026-001",
    workflow: "QUOTE_AND_PURCHASE_ORDER",
    status: "DRAFT",
    archivedAt: null,
    managerAssigneeId: "44444444-4444-4444-8444-444444444444",
    secretaryAssigneeId: "55555555-5555-4555-8555-555555555555",
    customer: { id: "66666666-6666-4666-8666-666666666666", name: "לקוח", customerNumber: "1" },
    manager: {
      id: "44444444-4444-4444-8444-444444444444",
      displayName: "מנהל",
      email: "m@example.com",
    },
    secretary: {
      id: "55555555-5555-4555-8555-555555555555",
      displayName: "פקיד",
      email: "s@example.com",
    },
    documents: [
      {
        id: "77777777-7777-4777-8777-777777777777",
        type: "WORK_REPORT",
        versions: [{ id: "88888888-8888-4888-8888-888888888888", versionNumber: 1 }],
      },
      {
        id: "99999999-9999-4999-8999-999999999999",
        type: "INVOICE",
        versions: [{ id: invoiceVersionId, versionNumber: 1 }],
      },
    ],
    deliveries: [],
  };
}

describe("document-case service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires a purchase-order version before submitting an invoice in the quote workflow", async () => {
    mocks.documentCaseFindFirst.mockResolvedValue(caseWaitingForInvoiceReview());

    await expect(
      submitForReview(
        organizationId,
        caseId,
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        invoiceVersionId,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });
});
