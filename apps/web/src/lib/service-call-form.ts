import type { ServiceCallPriority } from "@amarok-one/types";

/** Metadata fields allowed on create (no lifecycle fields). */
export interface ServiceCallCreatePayload {
  serviceCallNumber: string;
  title: string;
  description?: string;
  priority?: ServiceCallPriority;
  openedAt?: string;
  scheduledAt?: string;
  customerId: string;
  equipmentId: string;
  branchId?: string;
  contactName?: string;
  contactPhone?: string;
  location?: string;
  notes?: string;
}

/** Metadata fields allowed on PATCH (managers with service_calls:write). */
export interface ServiceCallUpdatePayload {
  serviceCallNumber?: string;
  title?: string;
  description?: string | null;
  priority?: ServiceCallPriority;
  openedAt?: string;
  scheduledAt?: string | null;
  customerId?: string;
  equipmentId?: string;
  branchId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  location?: string | null;
  notes?: string | null;
}

export interface ServiceCallFormValues {
  serviceCallNumber: string;
  title: string;
  description: string;
  priority: ServiceCallPriority;
  customerId: string;
  equipmentId: string;
  branchId: string;
  contactName: string;
  contactPhone: string;
  location: string;
  notes: string;
}

export const EMPTY_SERVICE_CALL_FORM: ServiceCallFormValues = {
  serviceCallNumber: "",
  title: "",
  description: "",
  priority: "normal",
  customerId: "",
  equipmentId: "",
  branchId: "",
  contactName: "",
  contactPhone: "",
  location: "",
  notes: "",
};

export function buildCreatePayload(
  values: ServiceCallFormValues,
  scheduling: { openedAt?: string; scheduledAt?: string },
): ServiceCallCreatePayload {
  return {
    serviceCallNumber: values.serviceCallNumber.trim(),
    title: values.title.trim(),
    description: values.description.trim() || undefined,
    priority: values.priority,
    customerId: values.customerId,
    equipmentId: values.equipmentId,
    openedAt: scheduling.openedAt,
    scheduledAt: scheduling.scheduledAt,
    branchId: values.branchId.trim() || undefined,
    contactName: values.contactName.trim() || undefined,
    contactPhone: values.contactPhone.trim() || undefined,
    location: values.location.trim() || undefined,
    notes: values.notes.trim() || undefined,
  };
}

export function buildUpdatePayload(
  values: ServiceCallFormValues,
  scheduling: { openedAt?: string; scheduledAt?: string | null },
): ServiceCallUpdatePayload {
  return {
    serviceCallNumber: values.serviceCallNumber.trim(),
    title: values.title.trim(),
    description: values.description.trim() || null,
    priority: values.priority,
    customerId: values.customerId,
    equipmentId: values.equipmentId,
    openedAt: scheduling.openedAt,
    scheduledAt: scheduling.scheduledAt ?? null,
    branchId: values.branchId.trim() ? values.branchId.trim() : null,
    contactName: values.contactName.trim() || null,
    contactPhone: values.contactPhone.trim() || null,
    location: values.location.trim() || null,
    notes: values.notes.trim() || null,
  };
}
