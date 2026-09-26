import { apiRequest } from "./api-client";

export interface TechnicianSummary {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED";
  isActive: boolean;
  role: { id: string; slug: string; name: string };
  assignedVan?: { id: string; name: string };
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

export async function assignTechnicianServiceVanRequest(
  organizationId: string,
  technicianId: string,
  accessToken: string,
  inventoryLocationId: string | null,
): Promise<{ id: string; name: string } | null> {
  const response = await apiRequest<{ id: string; name: string } | null>(
    `/organizations/${organizationId}/technicians/${technicianId}/assigned-van`,
    {
      method: "PATCH",
      accessToken,
      body: JSON.stringify({ inventoryLocationId }),
    },
  );
  return response.data;
}
