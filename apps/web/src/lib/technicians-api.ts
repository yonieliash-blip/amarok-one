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
