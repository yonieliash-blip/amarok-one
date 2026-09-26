import type {
  CatalogPart,
  InventoryItem,
  InventoryLocationSummary,
  InventoryOverview,
  PartCatalogCategoryGroup,
  PartCategory,
  PartSubcategory,
} from "@amarok-one/types";
import { apiRequest } from "./client";

function partsBase(organizationId: string): string {
  return `/organizations/${organizationId}/parts`;
}

function inventoryBase(organizationId: string): string {
  return `/organizations/${organizationId}/inventory`;
}

export async function listManagerPartsCatalog(
  organizationId: string,
  accessToken: string,
): Promise<PartCatalogCategoryGroup[]> {
  const response = await apiRequest<PartCatalogCategoryGroup[]>(partsBase(organizationId), {
    accessToken,
  });
  return response.data ?? [];
}

export async function createManagerPartCategory(
  organizationId: string,
  accessToken: string,
  name: string,
): Promise<PartCategory> {
  const response = await apiRequest<PartCategory>(`${partsBase(organizationId)}/categories`, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ name }),
  });
  return response.data;
}

export async function createManagerPartSubcategory(
  organizationId: string,
  accessToken: string,
  input: { categoryId: string; name: string },
): Promise<PartSubcategory> {
  const response = await apiRequest<PartSubcategory>(`${partsBase(organizationId)}/subcategories`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function createManagerCatalogPart(
  organizationId: string,
  accessToken: string,
  input: { categoryId: string; subcategoryId: string; name: string; partNumber?: string },
): Promise<CatalogPart> {
  const response = await apiRequest<CatalogPart>(`${partsBase(organizationId)}/catalog-parts`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function getManagerInventoryOverview(
  organizationId: string,
  accessToken: string,
): Promise<InventoryOverview> {
  const response = await apiRequest<InventoryOverview>(inventoryBase(organizationId), {
    accessToken,
  });
  return response.data;
}

export async function createManagerInventoryLocation(
  organizationId: string,
  accessToken: string,
  input: { name: string; type: "service_van" | "central_warehouse" },
): Promise<InventoryLocationSummary> {
  const response = await apiRequest<InventoryLocationSummary>(
    `${inventoryBase(organizationId)}/locations`,
    { method: "POST", accessToken, body: JSON.stringify(input) },
  );
  return response.data;
}

export async function addManagerInventoryItem(
  organizationId: string,
  accessToken: string,
  input: { locationId: string; partId: string; quantity: number },
): Promise<InventoryItem> {
  const response = await apiRequest<InventoryItem>(`${inventoryBase(organizationId)}/items`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  return response.data;
}

export interface ManagerTechnicianSummary {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED";
  isActive: boolean;
  role: { id: string; slug: string; name: string };
  assignedVan?: { id: string; name: string };
}

export async function listManagerTechnicians(
  organizationId: string,
  accessToken: string,
): Promise<ManagerTechnicianSummary[]> {
  const response = await apiRequest<ManagerTechnicianSummary[]>(
    `/organizations/${organizationId}/technicians`,
    { accessToken },
  );
  return response.data ?? [];
}

export async function assignManagerTechnicianVan(
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
