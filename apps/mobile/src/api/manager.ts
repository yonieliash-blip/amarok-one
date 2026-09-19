import type { Customer, Equipment } from "@amarok-one/types";
import { apiRequest } from "./client";

interface CurrentTechnicianLocation {
  userId: string;
  displayName: string;
  email: string;
  workDayId: string | null;
  startedAt: string | null;
  location: { recordedAt: string; latitude: number; longitude: number; accuracy: number | null } | null;
}

export async function listCustomers(organizationId: string, accessToken: string): Promise<Customer[]> {
  const response = await apiRequest<Customer[]>(`/organizations/${organizationId}/customers?pageSize=100`, { accessToken });
  return response.data ?? [];
}

export async function listEquipment(organizationId: string, accessToken: string): Promise<Equipment[]> {
  const response = await apiRequest<Equipment[]>(`/organizations/${organizationId}/equipment?pageSize=100`, { accessToken });
  return response.data ?? [];
}

export async function listCurrentTechnicianLocations(organizationId: string, accessToken: string): Promise<CurrentTechnicianLocation[]> {
  const response = await apiRequest<CurrentTechnicianLocation[]>(`/organizations/${organizationId}/attendance/current-technician-locations`, { accessToken });
  return response.data ?? [];
}

export type { CurrentTechnicianLocation };
