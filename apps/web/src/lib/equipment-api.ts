import type {
  ApiMeta,
  Branch,
  Company,
  Equipment,
  EquipmentDetail,
  EquipmentStatus,
  EquipmentType,
} from "@amarok-one/types";
import { canWriteEquipment, extractPermissionSlugs } from "@amarok-one/permissions";
import { apiRequest } from "./api-client";

export interface ListEquipmentParams {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  manufacturer?: string;
  model?: string;
  equipmentTypeId?: string;
  status?: EquipmentStatus | "";
}

export interface ListEquipmentResult {
  data: Equipment[];
  meta?: ApiMeta;
}

function equipmentBase(organizationId: string): string {
  return `/organizations/${organizationId}/equipment`;
}

export async function listEquipmentTypesRequest(
  organizationId: string,
  accessToken: string,
): Promise<EquipmentType[]> {
  const response = await apiRequest<EquipmentType[]>(`${equipmentBase(organizationId)}/types`, {
    accessToken,
  });
  return response.data ?? [];
}

export async function listEquipmentRequest(
  organizationId: string,
  accessToken: string,
  params: ListEquipmentParams = {},
): Promise<ListEquipmentResult> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.customerId) searchParams.set("customerId", params.customerId);
  if (params.manufacturer?.trim()) searchParams.set("manufacturer", params.manufacturer.trim());
  if (params.model?.trim()) searchParams.set("model", params.model.trim());
  if (params.equipmentTypeId) searchParams.set("equipmentTypeId", params.equipmentTypeId);
  if (params.status) searchParams.set("status", params.status);

  const query = searchParams.toString();
  const path = `${equipmentBase(organizationId)}${query ? `?${query}` : ""}`;
  const response = await apiRequest<Equipment[]>(path, { accessToken });
  return { data: response.data ?? [], meta: response.meta };
}

export async function getEquipmentRequest(
  organizationId: string,
  equipmentId: string,
  accessToken: string,
): Promise<EquipmentDetail> {
  const response = await apiRequest<EquipmentDetail>(
    `${equipmentBase(organizationId)}/${equipmentId}`,
    { accessToken },
  );
  if (!response.data) {
    throw new Error("Equipment not found");
  }
  return response.data;
}

export interface EquipmentFormInput {
  name: string;
  internalNumber: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  equipmentTypeId: string;
  customerId?: string;
  branchId?: string;
  status?: EquipmentStatus;
  engineHours?: number;
  mileage?: number;
  registrationNumber?: string;
  warrantyEndDate?: string;
  location?: string;
  notes?: string;
}

export async function createEquipmentRequest(
  organizationId: string,
  accessToken: string,
  input: EquipmentFormInput,
): Promise<EquipmentDetail> {
  const response = await apiRequest<EquipmentDetail>(equipmentBase(organizationId), {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  if (!response.data) {
    throw new Error("Failed to create equipment");
  }
  return response.data;
}

export async function updateEquipmentRequest(
  organizationId: string,
  equipmentId: string,
  accessToken: string,
  input: Partial<EquipmentFormInput>,
): Promise<EquipmentDetail> {
  const response = await apiRequest<EquipmentDetail>(
    `${equipmentBase(organizationId)}/${equipmentId}`,
    {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(input),
    },
  );
  if (!response.data) {
    throw new Error("Failed to update equipment");
  }
  return response.data;
}

export async function deleteEquipmentRequest(
  organizationId: string,
  equipmentId: string,
  accessToken: string,
): Promise<void> {
  await apiRequest<void>(`${equipmentBase(organizationId)}/${equipmentId}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function listCompaniesRequest(
  organizationId: string,
  accessToken: string,
): Promise<Company[]> {
  const response = await apiRequest<Company[]>(`/organizations/${organizationId}/companies`, {
    accessToken,
  });
  return response.data ?? [];
}

export async function listBranchesRequest(
  organizationId: string,
  companyId: string,
  accessToken: string,
): Promise<Branch[]> {
  const response = await apiRequest<Branch[]>(
    `/organizations/${organizationId}/companies/${companyId}/branches`,
    { accessToken },
  );
  return response.data ?? [];
}

export function hasEquipmentWrite(permissions: { slug: string }[]): boolean {
  return canWriteEquipment(extractPermissionSlugs(permissions));
}
