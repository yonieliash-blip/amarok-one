import type {
  ApiMeta,
  Branch,
  Company,
  Customer,
  Equipment,
  OrganizationMember,
  ServiceCall,
  ServiceCallLifecycleState,
  ServiceCallLifecycleView,
  ServiceCallPriority,
  ServiceCallStatus,
} from "@amarok-one/types";
import {
  canAssignServiceCalls,
  canCloseServiceCalls,
  canWriteServiceCalls,
  extractPermissionSlugs,
} from "@amarok-one/permissions";
import { apiRequest } from "./api-client";
import { apiStatusForLifecycleFilter } from "./service-call-lifecycle-filter.js";
import type { ServiceCallCreatePayload, ServiceCallUpdatePayload } from "./service-call-form.js";

export interface ListServiceCallsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ServiceCallStatus | "";
  lifecycleState?: ServiceCallLifecycleState | "";
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
  const apiStatus =
    params.status ||
    (params.lifecycleState ? apiStatusForLifecycleFilter(params.lifecycleState) : undefined);

  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (apiStatus) searchParams.set("status", apiStatus);
  if (params.priority) searchParams.set("priority", params.priority);
  if (params.customerId) searchParams.set("customerId", params.customerId);
  if (params.equipmentId) searchParams.set("equipmentId", params.equipmentId);
  if (params.assignedUserId) searchParams.set("assignedUserId", params.assignedUserId);
  if (params.openedFrom) searchParams.set("openedFrom", params.openedFrom);
  if (params.openedTo) searchParams.set("openedTo", params.openedTo);

  const query = searchParams.toString();
  const path = `${serviceCallsBase(organizationId)}${query ? `?${query}` : ""}`;
  const response = await apiRequest<ServiceCall[]>(path, { accessToken });
  let data = response.data ?? [];
  if (params.lifecycleState) {
    data = data.filter((call) => call.lifecycleState === params.lifecycleState);
  }
  return { data, meta: response.meta };
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

export interface ServiceCallFormInput extends ServiceCallCreatePayload {
  /** @deprecated Lifecycle fields are rejected by the API — use lifecycle endpoints. */
  status?: ServiceCallStatus;
  /** @deprecated Use POST /lifecycle/assign */
  assignedUserId?: string | null;
  /** @deprecated Set by workflow on close */
  completedAt?: string;
}

export async function getServiceCallLifecycleRequest(
  organizationId: string,
  serviceCallId: string,
  accessToken: string,
): Promise<ServiceCallLifecycleView> {
  const response = await apiRequest<ServiceCallLifecycleView>(
    `${serviceCallsBase(organizationId)}/${serviceCallId}/lifecycle`,
    { accessToken },
  );
  if (!response.data) {
    throw new Error("Lifecycle not found");
  }
  return response.data;
}

export interface AssignTechnicianPayload {
  technicianId: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  notes?: string;
}

export async function assignTechnicianRequest(
  organizationId: string,
  serviceCallId: string,
  accessToken: string,
  payload: AssignTechnicianPayload,
): Promise<ServiceCallLifecycleView> {
  const response = await apiRequest<ServiceCallLifecycleView>(
    `${serviceCallsBase(organizationId)}/${serviceCallId}/lifecycle/assign`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(payload),
    },
  );
  if (!response.data) {
    throw new Error("Assign failed");
  }
  return response.data;
}

export async function transitionServiceCallLifecycleRequest(
  organizationId: string,
  serviceCallId: string,
  accessToken: string,
  payload: { toLifecycleState: ServiceCallLifecycleState; reason?: string },
): Promise<ServiceCallLifecycleView> {
  const response = await apiRequest<ServiceCallLifecycleView>(
    `${serviceCallsBase(organizationId)}/${serviceCallId}/lifecycle/transition`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(payload),
    },
  );
  if (!response.data) {
    throw new Error("Transition failed");
  }
  return response.data;
}

export async function closeServiceCallLifecycleRequest(
  organizationId: string,
  serviceCallId: string,
  accessToken: string,
  payload: { reason?: string } = {},
): Promise<ServiceCallLifecycleView> {
  const response = await apiRequest<ServiceCallLifecycleView>(
    `${serviceCallsBase(organizationId)}/${serviceCallId}/lifecycle/close`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(payload),
    },
  );
  if (!response.data) {
    throw new Error("Close failed");
  }
  return response.data;
}

export async function createServiceCallRequest(
  organizationId: string,
  accessToken: string,
  input: ServiceCallCreatePayload,
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
  input: ServiceCallUpdatePayload,
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

export function hasServiceCallsAssign(permissions: { slug: string }[]): boolean {
  return canAssignServiceCalls(extractPermissionSlugs(permissions));
}

export function hasServiceCallsClose(permissions: { slug: string }[]): boolean {
  return canCloseServiceCalls(extractPermissionSlugs(permissions));
}

export type { ServiceCallCreatePayload, ServiceCallUpdatePayload };

export type { Customer, Equipment, Branch, Company };
