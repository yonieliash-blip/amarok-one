import type {
  CatalogPart,
  PartCatalogCategoryGroup,
  PartCategory,
  PartSubcategory,
} from "@amarok-one/types";
import { apiRequest } from "./api-client";

function base(organizationId: string): string {
  return `/organizations/${organizationId}/parts`;
}

export async function listPartsCatalogRequest(
  organizationId: string,
  accessToken: string,
): Promise<PartCatalogCategoryGroup[]> {
  const response = await apiRequest<PartCatalogCategoryGroup[]>(base(organizationId), { accessToken });
  return response.data ?? [];
}

export async function createPartCategoryRequest(
  organizationId: string,
  accessToken: string,
  input: { name: string },
): Promise<PartCategory> {
  const response = await apiRequest<PartCategory>(`${base(organizationId)}/categories`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function createPartSubcategoryRequest(
  organizationId: string,
  accessToken: string,
  input: { categoryId: string; name: string },
): Promise<PartSubcategory> {
  const response = await apiRequest<PartSubcategory>(`${base(organizationId)}/subcategories`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function createCatalogPartRequest(
  organizationId: string,
  accessToken: string,
  input: { categoryId: string; subcategoryId: string; name: string; partNumber?: string },
): Promise<CatalogPart> {
  const response = await apiRequest<CatalogPart>(`${base(organizationId)}/catalog-parts`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  return response.data;
}
