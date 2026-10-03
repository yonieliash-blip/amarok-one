import type {
  EmployeeInspirationMessage,
  InspirationCurrent,
  InspirationEmployee,
  InspirationQuote,
} from "@amarok-one/types";
import { apiRequest } from "./api-client";

const basePath = (organizationId: string) => `/organizations/${organizationId}/inspiration`;

export async function getCurrentInspirationRequest(
  organizationId: string,
  accessToken: string,
): Promise<InspirationCurrent> {
  const response = await apiRequest<InspirationCurrent>(`${basePath(organizationId)}/current`, {
    accessToken,
  });
  return response.data ?? { kind: "none" };
}

export async function listInspirationEmployeesRequest(
  organizationId: string,
  accessToken: string,
): Promise<InspirationEmployee[]> {
  const response = await apiRequest<InspirationEmployee[]>(
    `${basePath(organizationId)}/employees`,
    {
      accessToken,
    },
  );
  return response.data ?? [];
}

export async function listInspirationQuotesRequest(
  organizationId: string,
  accessToken: string,
): Promise<InspirationQuote[]> {
  const response = await apiRequest<InspirationQuote[]>(`${basePath(organizationId)}/quotes`, {
    accessToken,
  });
  return response.data ?? [];
}

export async function createInspirationQuoteRequest(
  organizationId: string,
  accessToken: string,
  payload: { text: string; author?: string },
): Promise<InspirationQuote> {
  const response = await apiRequest<InspirationQuote>(`${basePath(organizationId)}/quotes`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(payload),
  });
  if (!response.data) throw new Error("Inspiration quote was not returned");
  return response.data;
}

export async function updateInspirationQuoteRequest(
  organizationId: string,
  quoteId: string,
  accessToken: string,
  payload: { text?: string; author?: string | null; isActive?: boolean },
): Promise<InspirationQuote> {
  const response = await apiRequest<InspirationQuote>(
    `${basePath(organizationId)}/quotes/${quoteId}`,
    {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(payload),
    },
  );
  if (!response.data) throw new Error("Inspiration quote was not returned");
  return response.data;
}

export async function listEmployeeInspirationMessagesRequest(
  organizationId: string,
  accessToken: string,
): Promise<EmployeeInspirationMessage[]> {
  const response = await apiRequest<EmployeeInspirationMessage[]>(
    `${basePath(organizationId)}/employee-messages`,
    { accessToken },
  );
  return response.data ?? [];
}

export async function saveEmployeeInspirationRequest(
  organizationId: string,
  memberId: string,
  accessToken: string,
  payload: { text: string; isActive?: boolean },
): Promise<EmployeeInspirationMessage> {
  const response = await apiRequest<EmployeeInspirationMessage>(
    `${basePath(organizationId)}/employees/${memberId}/message`,
    { method: "PUT", accessToken, body: JSON.stringify(payload) },
  );
  if (!response.data) throw new Error("Employee inspiration message was not returned");
  return response.data;
}

export async function updateEmployeeInspirationRequest(
  organizationId: string,
  memberId: string,
  accessToken: string,
  isActive: boolean,
): Promise<EmployeeInspirationMessage> {
  const response = await apiRequest<EmployeeInspirationMessage>(
    `${basePath(organizationId)}/employees/${memberId}/message`,
    { method: "PATCH", accessToken, body: JSON.stringify({ isActive }) },
  );
  if (!response.data) throw new Error("Employee inspiration message was not returned");
  return response.data;
}
