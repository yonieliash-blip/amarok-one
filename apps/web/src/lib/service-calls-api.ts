import type {
  ApiMeta,
  Branch,
  Company,
  Customer,
  Equipment,
  OrganizationMember,
  ServiceCall,
  ServiceCallPriority,
  ServiceCallStatus,
} from "@amarok-one/types";
import { canWriteServiceCalls, extractPermissionSlugs } from "@amarok-one/permissions";
import { apiRequest } from "./api-client";

export interface ListServiceCallsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ServiceCallStatus | "";
  priority?: ServiceCallPriority | "";
  customerId?: string;
  equipmentId?: string;
  assignedUserId?: string;
  openedFrom?: string;
  openedTo?: string;
}

export interface ListServiceCallsResult {
  data: ServiceCall[];
  meta?: ApiMeta;
}

function serviceCallsBase(organizationId: string): string {
  return `/organizations/${organizationId}/service-calls`;
}

export async function listAssignableUsersRequest(
  organizationId: string,
  accessToken: string,
): Promise<OrganizationMember[]> {
  const response = await apiRequest<OrganizationMember[]>(
    `${serviceCallsBase(organizationId)}/assignees`,
    { accessToken },
  );
  return response.data ?? [];
}

export async function listServiceCallsRequest(
  organizationId: string,
  accessToken: string,
  params: ListServiceCallsParams = {},
): Promise<ListServiceCallsResult> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.status) searchParams.set("status", params.status);
  if (params.priority) searchParams.set("priority", params.priority);
  if (params.customerId) searchParams.set("customerId", params.customerId);
  if (params.equipmentId) searchParams.set("equipmentId", params.equipmentId);
  if (params.assignedUserId) searchParams.set("assignedUserId", params.assignedUserId);
  if (params.openedFrom) searchParams.set("openedFrom", params.openedFrom);
  if (params.openedTo) searchParams.set("openedTo", params.openedTo);

  const query = searchParams.toString();
  const path = `${serviceCallsBase(organizationId)}${query ? `?${query}` : ""}`;
  const response = await apiRequest<ServiceCall[]>(path, { accessToken });
  return { data: response.data ?? [], meta: response.meta };
}

export async function getServiceCallRequest(
  organizationId: string,
  serviceCallId: string,
  accessToken: string,
): Promise<ServiceCall> {
  const response = await apiRequest<ServiceCall>(
    `${serviceCallsBase(organizationId)}/${serviceCallId}`,
    { accessToken },
  );
  if (!response.data) {
    throw new Error("Service call not found");
  }
  return response.data;
}

export interface ServiceCallFormInput {
  serviceCallNumber: string;
  title: string;
  description?: string;
  status?: ServiceCallStatus;
  priority?: ServiceCallPriority;
  openedAt?: string;
  scheduledAt?: string;
  completedAt?: string;
  customerId: string;
  equipmentId: string;
  branchId?: string;
  assignedUserId?: string | null;
  contactName?: string;
  contactPhone?: string;
  location?: string;
  notes?: string;
}

export async function createServiceCallRequest(
  organizationId: string,
  accessToken: string,
  input: ServiceCallFormInput,
): Promise<ServiceCall> {
  const response = await apiRequest<ServiceCall>(serviceCallsBase(organizationId), {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  if (!response.data) {
    throw new Error("Failed to create service call");
  }
  return response.data;
}

export async function updateServiceCallRequest(
  organizationId: string,
  serviceCallId: string,
  accessToken: string,
  input: Partial<ServiceCallFormInput>,
): Promise<ServiceCall> {
  const response = await apiRequest<ServiceCall>(
    `${serviceCallsBase(organizationId)}/${serviceCallId}`,
    {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(input),
    },
  );
  if (!response.data) {
    throw new Error("Failed to update service call");
  }
  return response.data;
}

export async function deleteServiceCallRequest(
  organizationId: string,
  serviceCallId: string,
  accessToken: string,
): Promise<void> {
  await apiRequest<void>(`${serviceCallsBase(organizationId)}/${serviceCallId}`, {
    method: "DELETE",
    accessToken,
  });
}

export function hasServiceCallsWrite(permissions: { slug: string }[]): boolean {
  return canWriteServiceCalls(extractPermissionSlugs(permissions));
}

export type { Customer, Equipment, Branch, Company };
