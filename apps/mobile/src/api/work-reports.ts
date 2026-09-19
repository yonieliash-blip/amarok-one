import type { WorkReport, WorkReportPartCategory } from "@amarok-one/types";
import { env } from "../config/env";
import { apiRequest, ApiRequestError } from "./client";

const base = (organizationId: string) => `/organizations/${organizationId}`;

export async function getWorkReport(organizationId: string, serviceCallId: string, visitId: string, accessToken: string): Promise<WorkReport> {
  const response = await apiRequest<WorkReport>(`${base(organizationId)}/service-calls/${serviceCallId}/visits/${visitId}/work-report`, { accessToken });
  if (!response.data) throw new Error("Work report not found");
  return response.data;
}
export async function listWorkReportParts(organizationId: string, accessToken: string): Promise<WorkReportPartCategory[]> {
  const response = await apiRequest<WorkReportPartCategory[]>(`${base(organizationId)}/work-report-parts`, { accessToken });
  return response.data ?? [];
}
export async function saveWorkReport(organizationId: string, reportId: string, accessToken: string, body: Pick<WorkReport, "workDescription" | "customerRepresentative" | "customerRepresentativeRole" | "signatureStrokes"> & { parts: { partId: string; quantity: number }[] }): Promise<WorkReport> {
  const response = await apiRequest<WorkReport>(`${base(organizationId)}/work-reports/${reportId}`, { method: "PUT", accessToken, body: JSON.stringify(body) });
  if (!response.data) throw new Error("Work report save failed");
  return response.data;
}
export async function uploadWorkReportMedia(organizationId: string, reportId: string, accessToken: string, uri: string, name: string, mimeType: string): Promise<void> {
  const form = new FormData(); form.append("file", { uri, name, type: mimeType } as unknown as Blob);
  const response = await fetch(`${env.apiUrl}${base(organizationId)}/work-reports/${reportId}/media`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: form });
  if (!response.ok) throw new ApiRequestError("UPLOAD_FAILED", "לא ניתן להעלות את הקובץ", response.status);
}
