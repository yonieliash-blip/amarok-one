import type {
  Branch,
  Company,
  Customer,
  CustomerContact,
  CustomerStatus,
  Equipment,
  EquipmentStatus,
  EquipmentType,
  Organization,
  OrganizationMember,
  ServiceCall,
  ServiceCallPriority,
  ServiceCallStatus,
} from "@amarok-one/types";
import type {
  Branch as BranchModel,
  Company as CompanyModel,
  Customer as CustomerModel,
  CustomerContact as CustomerContactModel,
  CustomerStatus as CustomerStatusModel,
  Equipment as EquipmentModel,
  EquipmentStatus as EquipmentStatusModel,
  EquipmentType as EquipmentTypeModel,
  Organization as OrganizationModel,
  Prisma,
  ServiceCall as ServiceCallModel,
  ServiceCallPriority as ServiceCallPriorityModel,
  ServiceCallStatus as ServiceCallStatusModel,
  User as UserModel,
  UserRole as UserRoleModel,
  Role as RoleModel,
} from "@prisma/client";
import { toServiceCallLifecycleStateDto } from "../modules/service-calls/service-call-lifecycle-mappers.js";

export function toOrganizationDto(model: OrganizationModel): Organization {
  return {
    id: model.id,
    name: model.name,
    slug: model.slug,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}

export function toCompanyDto(model: CompanyModel): Company {
  return {
    id: model.id,
    organizationId: model.organizationId,
    name: model.name,
    code: model.code,
    legalName: model.legalName ?? undefined,
    taxId: model.taxId ?? undefined,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}

export function toBranchDto(model: BranchModel): Branch {
  return {
    id: model.id,
    organizationId: model.organizationId,
    companyId: model.companyId,
    name: model.name,
    code: model.code,
    addressLine1: model.addressLine1 ?? undefined,
    city: model.city ?? undefined,
    country: model.country ?? undefined,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}

const STATUS_TO_DTO: Record<CustomerStatusModel, CustomerStatus> = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PROSPECT: "prospect",
};

const STATUS_FROM_DTO: Record<CustomerStatus, CustomerStatusModel> = {
  active: "ACTIVE",
  inactive: "INACTIVE",
  prospect: "PROSPECT",
};

export function toCustomerStatusDto(status: CustomerStatusModel): CustomerStatus {
  return STATUS_TO_DTO[status];
}

export function fromCustomerStatusDto(status: CustomerStatus): CustomerStatusModel {
  return STATUS_FROM_DTO[status];
}

export function toCustomerContactDto(model: CustomerContactModel): CustomerContact {
  return {
    id: model.id,
    organizationId: model.organizationId,
    customerId: model.customerId,
    name: model.name,
    email: model.email ?? undefined,
    phone: model.phone ?? undefined,
    jobTitle: model.jobTitle ?? undefined,
    isPrimary: model.isPrimary,
    notes: model.notes ?? undefined,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}

export function toCustomerDto(model: CustomerModel): Customer {
  return {
    id: model.id,
    organizationId: model.organizationId,
    name: model.name,
    legalName: model.legalName ?? undefined,
    registrationNumber: model.registrationNumber ?? undefined,
    customerNumber: model.customerNumber,
    email: model.email ?? undefined,
    phone: model.phone ?? undefined,
    address: model.address ?? undefined,
    city: model.city ?? undefined,
    country: model.country ?? undefined,
    notes: model.notes ?? undefined,
    status: toCustomerStatusDto(model.status),
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}

export const activeOnly = { deletedAt: null } as const;

export const equipmentInclude = {
  equipmentType: { select: { id: true, name: true, code: true } },
  customer: { select: { id: true, name: true, customerNumber: true } },
  branch: { select: { id: true, name: true, code: true } },
} satisfies Prisma.EquipmentInclude;

type EquipmentWithRelations = EquipmentModel & {
  equipmentType: { id: string; name: string; code: string };
  customer: { id: string; name: string; customerNumber: string } | null;
  branch: { id: string; name: string; code: string } | null;
};

const EQUIPMENT_STATUS_TO_DTO: Record<EquipmentStatusModel, EquipmentStatus> = {
  ACTIVE: "active",
  IN_SERVICE: "in_service",
  OUT_OF_SERVICE: "out_of_service",
  RETIRED: "retired",
};

const EQUIPMENT_STATUS_FROM_DTO: Record<EquipmentStatus, EquipmentStatusModel> = {
  active: "ACTIVE",
  in_service: "IN_SERVICE",
  out_of_service: "OUT_OF_SERVICE",
  retired: "RETIRED",
};

export function toEquipmentStatusDto(status: EquipmentStatusModel): EquipmentStatus {
  return EQUIPMENT_STATUS_TO_DTO[status];
}

export function fromEquipmentStatusDto(status: EquipmentStatus): EquipmentStatusModel {
  return EQUIPMENT_STATUS_FROM_DTO[status];
}

export function toEquipmentTypeDto(model: EquipmentTypeModel): EquipmentType {
  return {
    id: model.id,
    organizationId: model.organizationId,
    name: model.name,
    code: model.code,
    description: model.description ?? undefined,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}

export function toEquipmentDto(model: EquipmentWithRelations): Equipment {
  return {
    id: model.id,
    organizationId: model.organizationId,
    name: model.name,
    internalNumber: model.internalNumber,
    serialNumber: model.serialNumber ?? undefined,
    manufacturer: model.manufacturer ?? undefined,
    model: model.model ?? undefined,
    year: model.year ?? undefined,
    equipmentTypeId: model.equipmentTypeId,
    equipmentType: {
      id: model.equipmentType.id,
      name: model.equipmentType.name,
      code: model.equipmentType.code,
    },
    customerId: model.customerId ?? undefined,
    customer: model.customer
      ? {
          id: model.customer.id,
          name: model.customer.name,
          customerNumber: model.customer.customerNumber,
        }
      : undefined,
    branchId: model.branchId ?? undefined,
    branch: model.branch
      ? {
          id: model.branch.id,
          name: model.branch.name,
          code: model.branch.code,
        }
      : undefined,
    status: toEquipmentStatusDto(model.status),
    engineHours: model.engineHours !== null ? Number(model.engineHours) : undefined,
    mileage: model.mileage ?? undefined,
    registrationNumber: model.registrationNumber ?? undefined,
    warrantyEndDate: model.warrantyEndDate
      ? model.warrantyEndDate.toISOString().slice(0, 10)
      : undefined,
    location: model.location ?? undefined,
    notes: model.notes ?? undefined,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}

export const serviceCallInclude = {
  customer: { select: { id: true, name: true, customerNumber: true } },
  equipment: {
    select: { id: true, name: true, internalNumber: true, manufacturer: true, model: true },
  },
  branch: { select: { id: true, name: true, code: true } },
  assignedUser: { select: { id: true, email: true, displayName: true } },
} satisfies Prisma.ServiceCallInclude;

type ServiceCallWithRelations = ServiceCallModel & {
  customer: { id: string; name: string; customerNumber: string };
  equipment: {
    id: string;
    name: string;
    internalNumber: string;
    manufacturer: string | null;
    model: string | null;
  };
  branch: { id: string; name: string; code: string } | null;
  assignedUser: { id: string; email: string; displayName: string } | null;
};

const SERVICE_CALL_STATUS_TO_DTO: Record<ServiceCallStatusModel, ServiceCallStatus> = {
  OPEN: "open",
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  WAITING_FOR_PARTS: "waiting_for_parts",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const SERVICE_CALL_STATUS_FROM_DTO: Record<ServiceCallStatus, ServiceCallStatusModel> = {
  open: "OPEN",
  scheduled: "SCHEDULED",
  in_progress: "IN_PROGRESS",
  waiting_for_parts: "WAITING_FOR_PARTS",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
};

const SERVICE_CALL_PRIORITY_TO_DTO: Record<ServiceCallPriorityModel, ServiceCallPriority> = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
};

const SERVICE_CALL_PRIORITY_FROM_DTO: Record<ServiceCallPriority, ServiceCallPriorityModel> = {
  low: "LOW",
  normal: "NORMAL",
  high: "HIGH",
  urgent: "URGENT",
};

export function toServiceCallStatusDto(status: ServiceCallStatusModel): ServiceCallStatus {
  return SERVICE_CALL_STATUS_TO_DTO[status];
}

export function fromServiceCallStatusDto(status: ServiceCallStatus): ServiceCallStatusModel {
  return SERVICE_CALL_STATUS_FROM_DTO[status];
}

export function toServiceCallPriorityDto(priority: ServiceCallPriorityModel): ServiceCallPriority {
  return SERVICE_CALL_PRIORITY_TO_DTO[priority];
}

export function fromServiceCallPriorityDto(
  priority: ServiceCallPriority,
): ServiceCallPriorityModel {
  return SERVICE_CALL_PRIORITY_FROM_DTO[priority];
}

type UserRoleWithRelations = UserRoleModel & {
  user: UserModel;
  role: RoleModel;
};

export function toOrganizationMemberDto(membership: UserRoleWithRelations): OrganizationMember {
  return {
    id: membership.user.id,
    email: membership.user.email,
    displayName: membership.user.displayName,
    role: {
      id: membership.role.id,
      slug: membership.role.slug,
      name: membership.role.name,
    },
  };
}

export function toServiceCallDto(model: ServiceCallWithRelations): ServiceCall {
  return {
    id: model.id,
    organizationId: model.organizationId,
    serviceCallNumber: model.serviceCallNumber,
    title: model.title,
    description: model.description ?? undefined,
    status: toServiceCallStatusDto(model.status),
    lifecycleState: toServiceCallLifecycleStateDto(model.lifecycleState),
    priority: toServiceCallPriorityDto(model.priority),
    openedAt: model.openedAt.toISOString(),
    scheduledAt: model.scheduledAt?.toISOString(),
    completedAt: model.completedAt?.toISOString(),
    customerId: model.customerId,
    customer: {
      id: model.customer.id,
      name: model.customer.name,
      customerNumber: model.customer.customerNumber,
    },
    equipmentId: model.equipmentId,
    equipment: {
      id: model.equipment.id,
      name: model.equipment.name,
      internalNumber: model.equipment.internalNumber,
      manufacturer: model.equipment.manufacturer ?? undefined,
      model: model.equipment.model ?? undefined,
    },
    branchId: model.branchId ?? undefined,
    branch: model.branch
      ? {
          id: model.branch.id,
          name: model.branch.name,
          code: model.branch.code,
        }
      : undefined,
    assignedUserId: model.assignedUserId ?? undefined,
    assignedUser: model.assignedUser
      ? {
          id: model.assignedUser.id,
          email: model.assignedUser.email,
          displayName: model.assignedUser.displayName,
        }
      : undefined,
    contactName: model.contactName ?? undefined,
    contactPhone: model.contactPhone ?? undefined,
    location: model.location ?? undefined,
    notes: model.notes ?? undefined,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}
