import type { ServiceCallPriority } from "@amarok-one/types";

/** Metadata fields allowed on create (no lifecycle fields). */
export interface ServiceCallCreatePayload {
  title: string;
  description?: string;
  priority?: ServiceCallPriority;
  openedAt?: string;
  scheduledAt?: string;
  customerId: string;
  customerSiteId?: string;
  equipmentId?: string;
  branchId?: string;
  contactName?: string;
  contactPhone?: string;
  location?: string;
  equipmentModel?: string;
  equipmentLicensePlate?: string;
  equipmentChassisNumber?: string;
  purchaseOrderNumber?: string;
  notes?: string;
}

/** Metadata fields allowed on PATCH (managers with service_calls:write). */
export interface ServiceCallUpdatePayload {
  title?: string;
  description?: string | null;
  priority?: ServiceCallPriority;
  openedAt?: string;
  scheduledAt?: string | null;
  customerId?: string;
  customerSiteId?: string | null;
  equipmentId?: string | null;
  branchId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  location?: string | null;
  equipmentModel?: string | null;
  equipmentLicensePlate?: string | null;
  equipmentChassisNumber?: string | null;
  purchaseOrderNumber?: string | null;
  notes?: string | null;
}

export interface ServiceCallFormValues {
  serviceCallNumber: string;
  title: string;
  description: string;
  priority: ServiceCallPriority;
  customerId: string;
  customerSiteId: string;
  equipmentId: string;
  branchId: string;
  contactName: string;
  contactPhone: string;
  location: string;
  equipmentModel: string;
  equipmentLicensePlate: string;
  equipmentChassisNumber: string;
  purchaseOrderNumber: string;
  notes: string;
}

export const EMPTY_SERVICE_CALL_FORM: ServiceCallFormValues = {
  serviceCallNumber: "",
  title: "",
  description: "",
  priority: "normal",
  customerId: "",
  customerSiteId: "",
  equipmentId: "",
  branchId: "",
  contactName: "",
  contactPhone: "",
  location: "",
  equipmentModel: "",
  equipmentLicensePlate: "",
  equipmentChassisNumber: "",
  purchaseOrderNumber: "",
  notes: "",
};

export function buildCreatePayload(
  values: ServiceCallFormValues,
  scheduling: { openedAt?: string; scheduledAt?: string },
): ServiceCallCreatePayload {
  return {
    title: values.title.trim(),
    description: values.description.trim() || undefined,
    priority: values.priority,
    customerId: values.customerId,
    customerSiteId: values.customerSiteId.trim() || undefined,
    equipmentId: values.equipmentId.trim() || undefined,
    openedAt: scheduling.openedAt,
    scheduledAt: scheduling.scheduledAt,
    branchId: values.branchId.trim() || undefined,
    contactName: values.contactName.trim() || undefined,
    contactPhone: values.contactPhone.trim() || undefined,
    location: values.location.trim() || undefined,
    equipmentModel: values.equipmentModel.trim() || undefined,
    equipmentLicensePlate: values.equipmentLicensePlate.trim() || undefined,
    equipmentChassisNumber: values.equipmentChassisNumber.trim() || undefined,
    purchaseOrderNumber: values.purchaseOrderNumber.trim() || undefined,
    notes: values.notes.trim() || undefined,
  };
}

export function buildUpdatePayload(
  values: ServiceCallFormValues,
  scheduling: { openedAt?: string; scheduledAt?: string | null },
): ServiceCallUpdatePayload {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    priority: values.priority,
    customerId: values.customerId,
    customerSiteId: values.customerSiteId.trim() ? values.customerSiteId.trim() : null,
    equipmentId: values.equipmentId.trim() ? values.equipmentId.trim() : null,
    openedAt: scheduling.openedAt,
    scheduledAt: scheduling.scheduledAt ?? null,
    branchId: values.branchId.trim() ? values.branchId.trim() : null,
    contactName: values.contactName.trim() || null,
    contactPhone: values.contactPhone.trim() || null,
    location: values.location.trim() || null,
    equipmentModel: values.equipmentModel.trim() || null,
    equipmentLicensePlate: values.equipmentLicensePlate.trim() || null,
    equipmentChassisNumber: values.equipmentChassisNumber.trim() || null,
    purchaseOrderNumber: values.purchaseOrderNumber.trim() || null,
    notes: values.notes.trim() || null,
  };
}
