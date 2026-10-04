import { describe, expect, it } from "vitest";
import {
  appendDocumentVersionSchema,
  createDocumentCaseSchema,
  recordDeliverySchema,
} from "./document-case.schemas.js";

const id = "11111111-1111-4111-8111-111111111111";

describe("document-case schemas", () => {
  it("accepts a case keyed by repair report number", () => {
    expect(
      createDocumentCaseSchema.parse({
        customerId: id,
        repairReportNumber: "R-2026-001",
        workflow: "direct_invoice",
        managerAssigneeId: id,
        secretaryAssigneeId: id,
      }),
    ).toMatchObject({ repairReportNumber: "R-2026-001" });
  });

  it("does not accept document metadata outside the no-file-upload phase", () => {
    expect(() =>
      appendDocumentVersionSchema.parse({
        type: "invoice",
        displayName: "חשבונית 101",
        fileUrl: "https://example.invalid/document.pdf",
      }),
    ).toThrow();
  });

  it("requires a recorded recipient channel before delivery is logged", () => {
    expect(() =>
      recordDeliverySchema.parse({
        documentVersionIds: [id],
        recipientName: "לקוח לדוגמה",
        channel: "email",
      }),
    ).toThrow();

    expect(
      recordDeliverySchema.parse({
        documentVersionIds: [id],
        recipientName: "לקוח לדוגמה",
        recipientEmail: "customer@example.com",
        channel: "email",
      }),
    ).toMatchObject({ channel: "email" });
  });
});
