import type {
  ApiMeta,
  OrganizationMember,
  ServiceCall,
  ServiceCallPriority,
  ServiceCallStatus,
} from "@amarok-one/types";
import { Prisma } from "@prisma/client";
import { writeAuditLog } from "../../lib/audit.js";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js";
import {
  activeOnly,
  fromServiceCallPriorityDto,
  fromServiceCallStatusDto,
  serviceCallInclude,
  toOrganizationMemberDto,
  toServiceCallDto,
  toServiceCallStatusDto,
} from "../../lib/mappers.js";
import { paginationMeta, parsePagination } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { assertOrganizationExists } from "../organizations/organization.service.js";
import { buildServiceCallListWhere } from "./service-call-filters.js";
import { assertEquipmentMatchesCustomer } from "./service-call-relationship.js";
import type { CreateServiceCallInput, UpdateServiceCallInput } from "./service-call.schemas.js";
import { canTransitionServiceCallStatus } from "./service-call-transitions.js";

function parseDate(value?: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }
  return new Date(value);
}

async function assertCustomerInOrganization(
  organizationId: string,
  customerId: string,
): Promise<void> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId, ...activeOnly },
    select: { id: true },
  });

  if (!customer) {
    throw notFound("Customer", customerId);
  }
}

async function assertEquipmentInOrganization(
  organizationId: string,
  equipmentId: string,
): Promise<{ id: string; customerId: string | null }> {
  const equipment = await prisma.equipment.findFirst({
    where: { id: equipmentId, organizationId, ...activeOnly },
    select: { id: true, customerId: true },
  });

  if (!equipment) {
    throw notFound("Equipment", equipmentId);
  }

  return equipment;
}

async function assertBranchInOrganization(organizationId: string, branchId: string): Promise<void> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId, ...activeOnly },
    select: { id: true },
  });

  if (!branch) {
    throw notFound("Branch", branchId);
  }
}

async function assertAssignableUser(organizationId: string, userId: string): Promise<void> {
  const membership = await prisma.userRole.findFirst({
    where: {
      organizationId,
      userId,
      deletedAt: null,
      user: { deletedAt: null, isActive: true },
    },
    select: { id: true },
  });

  if (!membership) {
    throw badRequest("Assigned user is not an active member of this organization", {
      assignedUserId: userId,
    });
  }
}

async function validateCustomerEquipmentLink(
  organizationId: string,
  customerId: string,
  equipmentId: string,
): Promise<void> {
  await assertCustomerInOrganization(organizationId, customerId);
  const equipment = await assertEquipmentInOrganization(organizationId, equipmentId);
  assertEquipmentMatchesCustomer(equipment, customerId);
}

function assertStatusTransition(current: ServiceCallStatus, next: ServiceCallStatus): void {
  if (!canTransitionServiceCallStatus(current, next)) {
    throw badRequest(`Invalid status transition from '${current}' to '${next}'`, {
      from: current,
      to: next,
    });
  }
}

export async function assertAssignedServiceCallAccess(
  organizationId: string,
  serviceCallId: string,
  userId: string,
): Promise<void> {
  const serviceCall = await prisma.serviceCall.findFirst({
    where: { id: serviceCallId, organizationId, ...activeOnly },
    select: { assignedUserId: true },
  });

  if (!serviceCall) {
    throw notFound("ServiceCall", serviceCallId);
  }

  if (serviceCall.assignedUserId !== userId) {
    throw forbidden("Insufficient permissions");
  }
}

export async function listAssignableUsers(organizationId: string): Promise<OrganizationMember[]> {
  await assertOrganizationExists(organizationId);

  const memberships = await prisma.userRole.findMany({
    where: {
      organizationId,
      deletedAt: null,
      user: { deletedAt: null, isActive: true },
    },
    include: {
      user: true,
      role: true,
    },
    orderBy: [{ user: { displayName: "asc" } }, { createdAt: "asc" }],
  });

  const byUserId = new Map<string, (typeof memberships)[number]>();
  for (const membership of memberships) {
    if (!byUserId.has(membership.userId)) {
      byUserId.set(membership.userId, membership);
    }
  }

  return [...byUserId.values()].map(toOrganizationMemberDto);
}

export async function listServiceCalls(
  organizationId: string,
  pageValue?: string,
  pageSizeValue?: string,
  search?: string,
  status?: ServiceCallStatus,
  priority?: ServiceCallPriority,
  customerId?: string,
  equipmentId?: string,
  assignedUserId?: string,
  openedFrom?: string,
  openedTo?: string,
) {
  await assertOrganizationExists(organizationId);

  const { page, pageSize, skip } = parsePagination(pageValue, pageSizeValue);
  const where = buildServiceCallListWhere({
    organizationId,
    search,
    status,
    priority,
    customerId,
    equipmentId,
    assignedUserId,
    openedFrom,
    openedTo,
  });

  const [items, total] = await prisma.$transaction([
    prisma.serviceCall.findMany({
      where,
      include: serviceCallInclude,
      orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.serviceCall.count({ where }),
  ]);

  const meta: ApiMeta = paginationMeta(total, page, pageSize);
  const data: ServiceCall[] = items.map(toServiceCallDto);

  return { data, meta };
}

export async function getServiceCallById(
  organizationId: string,
  serviceCallId: string,
): Promise<ServiceCall> {
  const serviceCall = await prisma.serviceCall.findFirst({
    where: { id: serviceCallId, organizationId, ...activeOnly },
    include: serviceCallInclude,
  });

  if (!serviceCall) {
    throw notFound("ServiceCall", serviceCallId);
  }

  return toServiceCallDto(serviceCall);
}

export async function createServiceCall(
  organizationId: string,
  input: CreateServiceCallInput,
  actorId?: string,
): Promise<ServiceCall> {
  await assertOrganizationExists(organizationId);
  await validateCustomerEquipmentLink(organizationId, input.customerId, input.equipmentId);

  if (input.branchId) {
    await assertBranchInOrganization(organizationId, input.branchId);
  }

  if (input.assignedUserId) {
    await assertAssignableUser(organizationId, input.assignedUserId);
  }

  const status = input.status ?? "open";

  try {
    const serviceCall = await prisma.serviceCall.create({
      data: {
        organizationId,
        serviceCallNumber: input.serviceCallNumber,
        title: input.title,
        description: input.description,
        status: fromServiceCallStatusDto(status),
        priority: input.priority ? fromServiceCallPriorityDto(input.priority) : undefined,
        openedAt: parseDate(input.openedAt) ?? new Date(),
        scheduledAt: parseDate(input.scheduledAt),
        completedAt: parseDate(input.completedAt),
        customerId: input.customerId,
        equipmentId: input.equipmentId,
        branchId: input.branchId,
        assignedUserId: input.assignedUserId,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        location: input.location,
        notes: input.notes,
      },
      include: serviceCallInclude,
    });

    await writeAuditLog({
      organizationId,
      actorId,
      action: "service_call.created",
      entityType: "ServiceCall",
      entityId: serviceCall.id,
      metadata: {
        serviceCallNumber: serviceCall.serviceCallNumber,
        title: serviceCall.title,
        status: toServiceCallStatusDto(serviceCall.status),
      },
    });

    if (serviceCall.assignedUserId) {
      await writeAuditLog({
        organizationId,
        actorId,
        action: "service_call.assigned",
        entityType: "ServiceCall",
        entityId: serviceCall.id,
        metadata: { assignedUserId: serviceCall.assignedUserId },
      });
    }

    return toServiceCallDto(serviceCall);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Service call number already exists in this organization", {
        serviceCallNumber: input.serviceCallNumber,
      });
    }
    throw error;
  }
}

export async function updateServiceCall(
  organizationId: string,
  serviceCallId: string,
  input: UpdateServiceCallInput,
  actorId?: string,
): Promise<ServiceCall> {
  const existing = await getServiceCallById(organizationId, serviceCallId);

  const nextCustomerId = input.customerId ?? existing.customerId;
  const nextEquipmentId = input.equipmentId ?? existing.equipmentId;

  if (input.customerId !== undefined || input.equipmentId !== undefined) {
    await validateCustomerEquipmentLink(organizationId, nextCustomerId, nextEquipmentId);
  }

  if (input.branchId) {
    await assertBranchInOrganization(organizationId, input.branchId);
  }

  if (input.assignedUserId) {
    await assertAssignableUser(organizationId, input.assignedUserId);
  }

  if (input.status !== undefined) {
    assertStatusTransition(existing.status, input.status);
  }

  const nextStatus = input.status ?? existing.status;
  const data: Prisma.ServiceCallUpdateInput = {
    ...(input.serviceCallNumber !== undefined
      ? { serviceCallNumber: input.serviceCallNumber }
      : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.status !== undefined ? { status: fromServiceCallStatusDto(input.status) } : {}),
    ...(input.priority !== undefined
      ? { priority: fromServiceCallPriorityDto(input.priority) }
      : {}),
    ...(input.openedAt !== undefined ? { openedAt: parseDate(input.openedAt) } : {}),
    ...(input.scheduledAt !== undefined
      ? { scheduledAt: input.scheduledAt === null ? null : parseDate(input.scheduledAt) }
      : {}),
    ...(input.completedAt !== undefined
      ? { completedAt: input.completedAt === null ? null : parseDate(input.completedAt) }
      : nextStatus === "completed" && existing.status !== "completed"
        ? { completedAt: new Date() }
        : {}),
    ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
    ...(input.equipmentId !== undefined ? { equipmentId: input.equipmentId } : {}),
    ...(input.branchId !== undefined
      ? input.branchId === null
        ? { branch: { disconnect: true } }
        : { branch: { connect: { id: input.branchId } } }
      : {}),
    ...(input.assignedUserId !== undefined
      ? input.assignedUserId === null
        ? { assignedUser: { disconnect: true } }
        : { assignedUser: { connect: { id: input.assignedUserId } } }
      : {}),
    ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
    ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
    ...(input.location !== undefined ? { location: input.location } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };

  try {
    const serviceCall = await prisma.serviceCall.update({
      where: { id: serviceCallId },
      data,
      include: serviceCallInclude,
    });

    await writeAuditLog({
      organizationId,
      actorId,
      action: "service_call.updated",
      entityType: "ServiceCall",
      entityId: serviceCall.id,
      metadata: { fields: Object.keys(input) },
    });

    if (input.status !== undefined && input.status !== existing.status) {
      await writeAuditLog({
        organizationId,
        actorId,
        action: "service_call.status_changed",
        entityType: "ServiceCall",
        entityId: serviceCall.id,
        metadata: { from: existing.status, to: input.status },
      });
    }

    if (
      input.assignedUserId !== undefined &&
      input.assignedUserId !== (existing.assignedUserId ?? null)
    ) {
      await writeAuditLog({
        organizationId,
        actorId,
        action: "service_call.assigned",
        entityType: "ServiceCall",
        entityId: serviceCall.id,
        metadata: {
          from: existing.assignedUserId ?? null,
          to: input.assignedUserId,
        },
      });
    }

    return toServiceCallDto(serviceCall);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Service call number already exists in this organization", {
        serviceCallNumber: input.serviceCallNumber,
      });
    }
    throw error;
  }
}

export async function softDeleteServiceCall(
  organizationId: string,
  serviceCallId: string,
  actorId?: string,
): Promise<void> {
  const serviceCall = await getServiceCallById(organizationId, serviceCallId);

  await prisma.serviceCall.update({
    where: { id: serviceCallId },
    data: { deletedAt: new Date() },
  });

  await writeAuditLog({
    organizationId,
    actorId,
    action: "service_call.deleted",
    entityType: "ServiceCall",
    entityId: serviceCallId,
    metadata: {
      serviceCallNumber: serviceCall.serviceCallNumber,
      title: serviceCall.title,
    },
  });
}
