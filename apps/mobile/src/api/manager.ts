import type { Customer, CustomerContact, CustomerSite, Equipment, EquipmentType } from "@amarok-one/types";
import { apiRequest } from "./client";

export interface CreateCustomerPayload {
  name: string;
  registrationNumber: string;
  phone?: string;
  city?: string;
}

export interface CreateCustomerContactPayload {
  name: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface CreateCustomerSitePayload {
  name: string;
  address?: string;
  city?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface CreateEquipmentPayload {
  name: string;
  internalNumber: string;
  equipmentTypeId: string;
  customerId: string;
  customerSiteId?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
}

interface CurrentTechnicianLocation {
  userId: string;
  displayName: string;
  email: string;
  workDayId: string | null;
  startedAt: string | null;
  location: { recordedAt: string; latitude: number; longitude: number; accuracy: number | null } | null;
}

export async function listCustomers(organizationId: string, accessToken: string): Promise<Customer[]> {
  const response = await apiRequest<Customer[]>(`/organizations/${organizationId}/customers?pageSize=100`, { accessToken });
  return response.data ?? [];
}

export async function listEquipment(organizationId: string, accessToken: string): Promise<Equipment[]> {
  const response = await apiRequest<Equipment[]>(`/organizations/${organizationId}/equipment?pageSize=100`, { accessToken });
  return response.data ?? [];
}

export async function listEquipmentTypes(organizationId: string, accessToken: string): Promise<EquipmentType[]> {
  const response = await apiRequest<EquipmentType[]>(`/organizations/${organizationId}/equipment/types`, { accessToken });
  return response.data ?? [];
}

export async function listCustomerSites(organizationId: string, customerId: string, accessToken: string): Promise<CustomerSite[]> {
  const response = await apiRequest<CustomerSite[]>(`/organizations/${organizationId}/customers/${customerId}/sites`, { accessToken });
  return response.data ?? [];
}

export async function createCustomerSite(organizationId: string, customerId: string, accessToken: string, payload: CreateCustomerSitePayload): Promise<CustomerSite> {
  const response = await apiRequest<CustomerSite>(`/organizations/${organizationId}/customers/${customerId}/sites`, { method: "POST", accessToken, body: JSON.stringify(payload) });
  return response.data as CustomerSite;
}

export async function listCustomerContacts(organizationId: string, customerId: string, accessToken: string): Promise<CustomerContact[]> {
  const response = await apiRequest<CustomerContact[]>(`/organizations/${organizationId}/customers/${customerId}/contacts`, { accessToken });
  return response.data ?? [];
}

export async function createCustomerContact(organizationId: string, customerId: string, accessToken: string, payload: CreateCustomerContactPayload): Promise<CustomerContact> {
  const response = await apiRequest<CustomerContact>(`/organizations/${organizationId}/customers/${customerId}/contacts`, { method: "POST", accessToken, body: JSON.stringify(payload) });
  return response.data as CustomerContact;
}

export async function createCustomer(
  organizationId: string,
  accessToken: string,
  payload: CreateCustomerPayload,
): Promise<Customer> {
  const response = await apiRequest<Customer>(`/organizations/${organizationId}/customers`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(payload),
  });
  return response.data as Customer;
}

export async function createEquipment(
  organizationId: string,
  accessToken: string,
  payload: CreateEquipmentPayload,
): Promise<Equipment> {
  const response = await apiRequest<Equipment>(`/organizations/${organizationId}/equipment`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(payload),
  });
  return response.data as Equipment;
}

export async function listCurrentTechnicianLocations(organizationId: string, accessToken: string): Promise<CurrentTechnicianLocation[]> {
  const response = await apiRequest<CurrentTechnicianLocation[]>(`/organizations/${organizationId}/attendance/current-technician-locations`, { accessToken });
  return response.data ?? [];
}

export type { CurrentTechnicianLocation };
