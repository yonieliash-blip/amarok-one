import type { InventoryItem, InventoryLocationSummary, InventoryOverview } from "@amarok-one/types";
import { apiRequest } from "./api-client";

function base(organizationId: string): string {
  return `/organizations/${organizationId}/inventory`;
}

export async function getInventoryOverviewRequest(
  organizationId: string,
  accessToken: string,
): Promise<InventoryOverview> {
  const response = await apiRequest<InventoryOverview>(base(organizationId), { accessToken });
  return response.data;
}

export async function createInventoryLocationRequest(
  organizationId: string,
  accessToken: string,
  input: { name: string; type: "service_van" | "central_warehouse" },
): Promise<InventoryLocationSummary> {
  const response = await apiRequest<InventoryLocationSummary>(`${base(organizationId)}/locations`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function addInventoryItemRequest(
  organizationId: string,
  accessToken: string,
  input: { locationId: string; partId: string; quantity: number },
): Promise<InventoryItem> {
  const response = await apiRequest<InventoryItem>(`${base(organizationId)}/items`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  return response.data;
}
