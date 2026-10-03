import { apiRequest } from "./api-client";
import type { TechnicianAvailability, TechnicianAvailabilityStatus } from "@amarok-one/types";

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

export async function listTechnicianAvailabilityRequest(
  organizationId: string,
  accessToken: string,
  from: string,
  to: string,
): Promise<TechnicianAvailability[]> {
  const query = new URLSearchParams({ from, to });
  const response = await apiRequest<TechnicianAvailability[]>(
    `/organizations/${organizationId}/technicians/availability?${query.toString()}`,
    { accessToken },
  );
  return response.data ?? [];
}

export async function updateTechnicianAvailabilityRequest(
  organizationId: string,
  technicianId: string,
  date: string,
  accessToken: string,
  input: { status: TechnicianAvailabilityStatus; note?: string | null },
): Promise<TechnicianAvailability> {
  const response = await apiRequest<TechnicianAvailability>(
    `/organizations/${organizationId}/technicians/${technicianId}/availability/${date}`,
    {
      method: "PUT",
      accessToken,
      body: JSON.stringify(input),
    },
  );
  if (!response.data) throw new Error("Technician availability was not returned");
  return response.data;
}
