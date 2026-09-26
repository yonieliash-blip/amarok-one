import type { Customer, CustomerContact, Equipment, EquipmentType } from "@amarok-one/types";
import { apiRequest } from "./client";

function orgBase(organizationId: string): string {
  return `/organizations/${organizationId}`;
}

export async function listManagerCustomers(
  organizationId: string,
  accessToken: string,
): Promise<Customer[]> {
  const response = await apiRequest<Customer[]>(
    `${orgBase(organizationId)}/customers?pageSize=100&sortBy=name&sortOrder=asc`,
    { accessToken },
  );
  return response.data ?? [];
}

export async function createManagerCustomer(
  organizationId: string,
  accessToken: string,
  input: {
    name: string;
    registrationNumber?: string;
    phone?: string;
    address?: string;
    city?: string;
    status?: Customer["status"];
  },
): Promise<Customer> {
  const response = await apiRequest<Customer>(`${orgBase(organizationId)}/customers`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function createManagerCustomerContact(
  organizationId: string,
  customerId: string,
  accessToken: string,
  input: { name: string; phone?: string; isPrimary?: boolean },
): Promise<CustomerContact> {
  const response = await apiRequest<CustomerContact>(
    `${orgBase(organizationId)}/customers/${customerId}/contacts`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    },
  );
  return response.data;
}

export async function listManagerEquipment(
  organizationId: string,
  accessToken: string,
): Promise<Equipment[]> {
  const response = await apiRequest<Equipment[]>(
    `${orgBase(organizationId)}/equipment?pageSize=100`,
    { accessToken },
  );
  return response.data ?? [];
}

export async function listManagerEquipmentTypes(
  organizationId: string,
  accessToken: string,
): Promise<EquipmentType[]> {
  const response = await apiRequest<EquipmentType[]>(`${orgBase(organizationId)}/equipment/types`, {
    accessToken,
  });
  return response.data ?? [];
}

export async function createManagerEquipment(
  organizationId: string,
  accessToken: string,
  input: {
    name: string;
    internalNumber: string;
    equipmentTypeId: string;
    customerId?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
  },
): Promise<Equipment> {
  const response = await apiRequest<Equipment>(`${orgBase(organizationId)}/equipment`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
  return response.data;
}
