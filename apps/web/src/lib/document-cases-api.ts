import { apiRequest } from "./api-client";

export type DocumentCaseWorkflow = "direct_invoice" | "quote_and_purchase_order";

export interface DocumentCaseSummary {
  id: string;
  repairReportNumber: string;
  workflow: DocumentCaseWorkflow;
  status: string;
  customer: { id: string; name: string; customerNumber: string };
  manager: { id: string; displayName: string; email: string };
  secretary: { id: string; displayName: string; email: string };
  archivedAt?: string;
  updatedAt: string;
  documents: DocumentCaseDocument[];
  deliveries: DocumentCaseDelivery[];
}

export interface DocumentCaseAssignee {
  id: string;
  displayName: string;
  email: string;
}

export interface DocumentCaseDocumentVersion {
  id: string;
  versionNumber: number;
  displayName: string;
  externalDocumentNumber?: string;
  documentDate?: string;
  note?: string;
  createdAt: string;
  approval?: {
    decision: "approved" | "returned_for_correction";
    note?: string;
    decidedAt: string;
    decidedBy: string;
  };
}

export interface DocumentCaseDocument {
  id: string;
  type: "work_report" | "quote" | "purchase_order" | "invoice";
  versions: DocumentCaseDocumentVersion[];
}

export interface DocumentCaseDelivery {
  id: string;
  recipientName: string;
  channel: "email" | "whatsapp" | "other";
  sentAt: string;
  sentBy: string;
  versionIds: string[];
}

function base(organizationId: string): string {
  return `/organizations/${organizationId}/document-cases`;
}

export async function listDocumentCasesRequest(
  organizationId: string,
  accessToken: string,
): Promise<DocumentCaseSummary[]> {
  const response = await apiRequest<DocumentCaseSummary[]>(base(organizationId), { accessToken });
  return response.data ?? [];
}

export async function listDocumentCaseAssigneesRequest(
  organizationId: string,
  accessToken: string,
): Promise<DocumentCaseAssignee[]> {
  const response = await apiRequest<DocumentCaseAssignee[]>(`${base(organizationId)}/assignees`, {
    accessToken,
  });
  return response.data ?? [];
}

export async function createDocumentCaseRequest(
  organizationId: string,
  accessToken: string,
  input: {
    customerId: string;
    repairReportNumber: string;
    workflow: DocumentCaseWorkflow;
    managerAssigneeId: string;
    secretaryAssigneeId: string;
  },
): Promise<DocumentCaseSummary> {
  const response = await apiRequest<DocumentCaseSummary>(base(organizationId), {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  if (!response.data) throw new Error("Document case was not created");
  return response.data;
}

export async function appendDocumentVersionRequest(
  organizationId: string,
  accessToken: string,
  documentCaseId: string,
  input: {
    type: DocumentCaseDocument["type"];
    displayName: string;
    externalDocumentNumber?: string;
    documentDate?: string;
    note?: string;
  },
): Promise<DocumentCaseSummary> {
  const response = await apiRequest<DocumentCaseSummary>(
    `${base(organizationId)}/${documentCaseId}/versions`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    },
  );
  if (!response.data) throw new Error("Document version was not saved");
  return response.data;
}

export async function submitDocumentCaseForReviewRequest(
  organizationId: string,
  accessToken: string,
  documentCaseId: string,
  documentVersionId: string,
): Promise<DocumentCaseSummary> {
  const response = await apiRequest<DocumentCaseSummary>(
    `${base(organizationId)}/${documentCaseId}/review`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify({ documentVersionId }),
    },
  );
  if (!response.data) throw new Error("Document review was not requested");
  return response.data;
}

export async function decideDocumentVersionRequest(
  organizationId: string,
  accessToken: string,
  documentCaseId: string,
  documentVersionId: string,
  decision: "approved" | "returned_for_correction",
): Promise<DocumentCaseSummary> {
  const response = await apiRequest<DocumentCaseSummary>(
    `${base(organizationId)}/${documentCaseId}/versions/${documentVersionId}/decision`,
    { method: "POST", accessToken, body: JSON.stringify({ decision }) },
  );
  if (!response.data) throw new Error("Document decision was not saved");
  return response.data;
}

export async function recordDocumentDeliveryRequest(
  organizationId: string,
  accessToken: string,
  documentCaseId: string,
  input: {
    documentVersionIds: string[];
    recipientName: string;
    recipientEmail?: string;
    recipientPhone?: string;
    channel: "email" | "whatsapp" | "other";
    note?: string;
  },
): Promise<DocumentCaseSummary> {
  const response = await apiRequest<DocumentCaseSummary>(
    `${base(organizationId)}/${documentCaseId}/deliveries`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    },
  );
  if (!response.data) throw new Error("Delivery record was not saved");
  return response.data;
}
