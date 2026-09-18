import { apiRequest } from "./api-client";

export interface TechnicianSummary {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED";
  isActive: boolean;
  role: { id: string; slug: string; name: string };
}

export interface CreateTechnicianInput {
  displayName: string;
  email: string;
  password: string;
}

export async function listTechniciansRequest(
  organizationId: string,
  accessToken: string,
): Promise<TechnicianSummary[]> {
  const response = await apiRequest<TechnicianSummary[]>(
    `/organizations/${organizationId}/technicians`,
    { accessToken },
  );
  return response.data;
}

export async function createTechnicianRequest(
  organizationId: string,
  accessToken: string,
  input: CreateTechnicianInput,
): Promise<TechnicianSummary> {
  const response = await apiRequest<TechnicianSummary>(
    `/organizations/${organizationId}/technicians`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    },
  );
  return response.data;
}
