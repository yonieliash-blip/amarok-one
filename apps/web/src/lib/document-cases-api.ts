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
