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


export async function getManagerCustomer(
  organizationId: string,
  customerId: string,
  accessToken: string,
): Promise<Customer> {
  const response = await apiRequest<Customer>(
    `${orgBase(organizationId)}/customers/${customerId}`,
    { accessToken },
  );
  return response.data;
}

export async function updateManagerCustomer(
  organizationId: string,
  customerId: string,
  accessToken: string,
  input: Partial<{
    name: string;
    registrationNumber: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
  }>,
): Promise<Customer> {
  const response = await apiRequest<Customer>(
    `${orgBase(organizationId)}/customers/${customerId}`,
    {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(input),
    },
  );
  return response.data;
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


export async function getManagerEquipment(
  organizationId: string,
  equipmentId: string,
  accessToken: string,
): Promise<Equipment> {
  const response = await apiRequest<Equipment>(
    `${orgBase(organizationId)}/equipment/${equipmentId}`,
    { accessToken },
  );
  return response.data;
}

export async function updateManagerEquipment(
  organizationId: string,
  equipmentId: string,
  accessToken: string,
  input: Partial<{
    name: string;
    internalNumber: string;
    manufacturer: string | null;
    model: string | null;
    serialNumber: string | null;
    equipmentTypeId: string;
    customerId: string | null;
  }>,
): Promise<Equipment> {
  const response = await apiRequest<Equipment>(
    `${orgBase(organizationId)}/equipment/${equipmentId}`,
    {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(input),
    },
  );
  return response.data;
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
