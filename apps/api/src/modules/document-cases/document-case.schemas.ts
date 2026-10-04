import { z } from "zod";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";

const workflowSchema = z.enum(["direct_invoice", "quote_and_purchase_order"]);
const documentTypeSchema = z.enum(["work_report", "quote", "purchase_order", "invoice"]);
const approvalDecisionSchema = z.enum(["approved", "returned_for_correction"]);
const deliveryChannelSchema = z.enum(["email", "whatsapp", "other"]);

export const documentCaseIdParamSchema = organizationIdParamSchema.extend({
  documentCaseId: z.string().uuid(),
});

export const createDocumentCaseSchema = z
  .object({
    customerId: z.string().uuid(),
    repairReportNumber: z.string().trim().min(1).max(80),
    workflow: workflowSchema,
    managerAssigneeId: z.string().uuid(),
    secretaryAssigneeId: z.string().uuid(),
  })
  .strict();

export const appendDocumentVersionSchema = z
  .object({
    type: documentTypeSchema,
    displayName: z.string().trim().min(1).max(256),
    externalDocumentNumber: z.string().trim().min(1).max(128).optional(),
    documentDate: z.string().date().optional(),
    note: z.string().trim().max(4000).optional(),
    sourceWorkReportId: z.string().uuid().optional(),
  })
  .strict();

export const submitForReviewSchema = z.object({ documentVersionId: z.string().uuid() }).strict();

export const decideDocumentVersionSchema = z
  .object({
    decision: approvalDecisionSchema,
    note: z.string().trim().max(4000).optional(),
  })
  .strict();

export const recordDeliverySchema = z
  .object({
    documentVersionIds: z.array(z.string().uuid()).min(1).max(4),
    recipientName: z.string().trim().min(1).max(256),
    recipientEmail: z.string().trim().email().max(256).optional(),
    recipientPhone: z.string().trim().min(3).max(32).optional(),
    channel: deliveryChannelSchema,
    note: z.string().trim().max(4000).optional(),
    sentAt: z.string().datetime().optional(),
  })
  .strict()
  .refine((value) => value.recipientEmail || value.recipientPhone, {
    message: "A recipient email or phone is required",
  });

export type CreateDocumentCaseInput = z.infer<typeof createDocumentCaseSchema>;
export type AppendDocumentVersionInput = z.infer<typeof appendDocumentVersionSchema>;
export type DecideDocumentVersionInput = z.infer<typeof decideDocumentVersionSchema>;
export type RecordDeliveryInput = z.infer<typeof recordDeliverySchema>;
