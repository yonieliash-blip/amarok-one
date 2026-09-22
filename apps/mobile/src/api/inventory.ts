import type { InventoryItem, StockLocation } from "@amarok-one/types";
import { apiRequest } from "./client";

export async function listStockLocations(
  organizationId: string,
  accessToken: string,
  kind: StockLocation["kind"],
): Promise<StockLocation[]> {
  const response = await apiRequest<StockLocation[]>(
    `/organizations/${organizationId}/inventory/locations?kind=${kind}`,
    { accessToken },
  );
  return response.data ?? [];
}

export async function createStockLocation(
  organizationId: string,
  accessToken: string,
  input: Pick<StockLocation, "name" | "kind">,
): Promise<StockLocation> {
  const response = await apiRequest<StockLocation>(
    `/organizations/${organizationId}/inventory/locations`,
    { method: "POST", accessToken, body: JSON.stringify(input) },
  );
  return response.data as StockLocation;
}

export async function listInventoryItems(
  organizationId: string,
  locationId: string,
  accessToken: string,
): Promise<InventoryItem[]> {
  const response = await apiRequest<InventoryItem[]>(
    `/organizations/${organizationId}/inventory/locations/${locationId}/items`,
    { accessToken },
  );
  return response.data ?? [];
}

export async function createInventoryItem(
  organizationId: string,
  locationId: string,
  accessToken: string,
  input: Pick<InventoryItem, "name" | "partNumber" | "quantity" | "unit">,
): Promise<InventoryItem> {
  const response = await apiRequest<InventoryItem>(
    `/organizations/${organizationId}/inventory/locations/${locationId}/items`,
    { method: "POST", accessToken, body: JSON.stringify(input) },
  );
  return response.data as InventoryItem;
}

export async function updateInventoryItem(
  organizationId: string,
  itemId: string,
  accessToken: string,
  input: Partial<Pick<InventoryItem, "name" | "partNumber" | "quantity" | "unit">>,
): Promise<InventoryItem> {
  const response = await apiRequest<InventoryItem>(
    `/organizations/${organizationId}/inventory/items/${itemId}`,
    { method: "PATCH", accessToken, body: JSON.stringify(input) },
  );
  return response.data as InventoryItem;
}
