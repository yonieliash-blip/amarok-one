import type { ApiMeta, Customer, CustomerDetail, CustomerStatus } from "@amarok-one/types";
import { canWriteCustomers, extractPermissionSlugs } from "@amarok-one/permissions";
import { apiRequest } from "./api-client";

export interface ListCustomersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CustomerStatus | "";
}

export interface ListCustomersResult {
  data: Customer[];
  meta?: ApiMeta;
}

function customersBase(organizationId: string): string {
  return `/organizations/${organizationId}/customers`;
}

export async function listCustomersRequest(
  organizationId: string,
  accessToken: string,
  params: ListCustomersParams = {},
): Promise<ListCustomersResult> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.search?.trim()) searchParams.set("search", params.search.trim());
  if (params.status) searchParams.set("status", params.status);

  const query = searchParams.toString();
  const path = `${customersBase(organizationId)}${query ? `?${query}` : ""}`;
  const response = await apiRequest<Customer[]>(path, { accessToken });
  return { data: response.data ?? [], meta: response.meta };
}

export async function getCustomerRequest(
  organizationId: string,
  customerId: string,
  accessToken: string,
): Promise<CustomerDetail> {
  const response = await apiRequest<CustomerDetail>(
    `${customersBase(organizationId)}/${customerId}`,
    { accessToken },
  );
  if (!response.data) {
    throw new Error("Customer not found");
  }
  return response.data;
}

export interface CustomerFormInput {
  name: string;
  legalName?: string;
  registrationNumber?: string;
  customerNumber: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
  status?: CustomerStatus;
}

export async function createCustomerRequest(
  organizationId: string,
  accessToken: string,
  input: CustomerFormInput,
): Promise<Customer> {
  const response = await apiRequest<Customer>(customersBase(organizationId), {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  if (!response.data) {
    throw new Error("Failed to create customer");
  }
  return response.data;
}

export async function updateCustomerRequest(
  organizationId: string,
  customerId: string,
  accessToken: string,
  input: Partial<CustomerFormInput>,
): Promise<Customer> {
  const response = await apiRequest<Customer>(`${customersBase(organizationId)}/${customerId}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input),
  });
  if (!response.data) {
    throw new Error("Failed to update customer");
  }
  return response.data;
}

export async function deleteCustomerRequest(
  organizationId: string,
  customerId: string,
  accessToken: string,
): Promise<void> {
  await apiRequest<void>(`${customersBase(organizationId)}/${customerId}`, {
    method: "DELETE",
    accessToken,
  });
}

export function hasCustomersWrite(permissions: { slug: string }[]): boolean {
  return canWriteCustomers(extractPermissionSlugs(permissions));
}
