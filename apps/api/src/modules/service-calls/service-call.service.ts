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
} from "../../lib/mappers.js";
import { paginationMeta, parsePagination } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { mapWorkflowError } from "../../lib/workflow-errors.js";
import { PrismaWorkflowEventStore } from "../../infrastructure/workflow/prisma-workflow-event-store.js";
import { assertOrganizationExists } from "../organizations/organization.service.js";
import { buildServiceCallListWhere } from "./service-call-filters.js";
import { assertEquipmentMatchesCustomer } from "./service-call-relationship.js";
import type { CreateServiceCallInput, UpdateServiceCallInput } from "./service-call.schemas.js";
import type { ServiceCallWorkflowPort } from "./service-call-workflow.port.js";
import {
  assertCreateServiceCallHasNoLifecycleFields,
  assertTechnicianPatchAllowed,
  pickControlCenterPatch,
  pickTechnicianPatch,
} from "./service-call-update-policy.js";
import { projectServiceCallFromWorkflow } from "./service-call-workflow-projection.js";
import {
  createServiceCallLifecycleService,
  type ServiceCallLifecycleServiceDeps,
} from "./service-call-lifecycle.service.js";

export interface ServiceCallServiceDeps extends ServiceCallLifecycleServiceDeps {
  workflow: ServiceCallWorkflowPort;
}

export function createServiceCallService(deps: ServiceCallServiceDeps) {
  const { workflow } = deps;
  const lifecycle = createServiceCallLifecycleService({
    clock: deps.clock,
    ids: deps.ids,
  });

  async function assertAssignedServiceCallAccess(
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

    if (serviceCall.assignedUserId === userId) {
      return;
    }

    const activeVisit = await prisma.serviceCallVisit.findFirst({
      where: {
        organizationId,
        serviceCallId,
        technicianId: userId,
        deletedAt: null,
        status: { in: ["ASSIGNED", "DRIVING", "WORKING", "PLANNED", "CHECKED_IN", "IN_PROGRESS"] },
      },
      select: { id: true },
    });

    if (!activeVisit) {
      throw forbidden("Insufficient permissions");
    }
  }

  async function listAssignableUsers(organizationId: string): Promise<OrganizationMember[]> {
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

  async function listServiceCalls(
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

  async function loadServiceCallDto(
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

  async function getServiceCallById(
    organizationId: string,
    serviceCallId: string,
  ): Promise<ServiceCall> {
    return loadServiceCallDto(organizationId, serviceCallId);
  }

  async function reconcileServiceCallWorkflow(
    organizationId: string,
    serviceCallId: string,
    actorId?: string,
  ): Promise<void> {
    const dto = await loadServiceCallDto(organizationId, serviceCallId);
    try {
      await prisma.$transaction(async (tx) => {
        const eventStore = new PrismaWorkflowEventStore(tx);
        await workflow.reconcileServiceCallWorkflow(dto, actorId, { eventStore });
        await projectServiceCallFromWorkflow(tx, organizationId, serviceCallId);
      });
    } catch (error) {
      throw mapWorkflowError(error);
    }
  }

  async function createServiceCall(
    organizationId: string,
    input: CreateServiceCallInput,
    actorId?: string,
  ): Promise<ServiceCall> {
    await assertOrganizationExists(organizationId);
    await validateCustomerEquipmentLink(organizationId, input.customerId, input.equipmentId);
    assertCreateServiceCallHasNoLifecycleFields(input);

    if (input.branchId) {
      await assertBranchInOrganization(organizationId, input.branchId);
    }

    if (input.assignedUserId) {
      throw badRequest("Use POST /lifecycle/assign to assign a technician", {
        field: "assignedUserId",
      });
    }

    try {
      const dto = await prisma.$transaction(async (tx) => {
        const serviceCall = await tx.serviceCall.create({
          data: {
            organizationId,
            serviceCallNumber: input.serviceCallNumber,
            title: input.title,
            description: input.description,
            status: fromServiceCallStatusDto("open"),
            priority: input.priority ? fromServiceCallPriorityDto(input.priority) : undefined,
            openedAt: parseDate(input.openedAt) ?? new Date(),
            scheduledAt: parseDate(input.scheduledAt),
            customerId: input.customerId,
            equipmentId: input.equipmentId,
            branchId: input.branchId,
            contactName: input.contactName,
            contactPhone: input.contactPhone,
            location: input.location,
            notes: input.notes,
          },
          include: serviceCallInclude,
        });

        const created = toServiceCallDto(serviceCall);
        const eventStore = new PrismaWorkflowEventStore(tx);
        await workflow.syncAfterCreate(created, actorId, { eventStore });
        await lifecycle.enqueueAfterCreate(tx, organizationId, created.id, actorId);
        await projectServiceCallFromWorkflow(tx, organizationId, created.id);
        return created;
      });

      await writeAuditLog({
        organizationId,
        actorId,
        action: "service_call.created",
        entityType: "ServiceCall",
        entityId: dto.id,
        metadata: {
          serviceCallNumber: dto.serviceCallNumber,
          title: dto.title,
          status: dto.status,
        },
      });

      return dto;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw conflict("Service call number already exists in this organization", {
          serviceCallNumber: input.serviceCallNumber,
        });
      }
      throw mapWorkflowError(error);
    }
  }

  async function updateServiceCall(
    organizationId: string,
    serviceCallId: string,
    input: UpdateServiceCallInput,
    actorId?: string,
    options?: { technicianFieldNotesOnly?: boolean },
  ): Promise<ServiceCall> {
    const patchInput = options?.technicianFieldNotesOnly
      ? pickTechnicianPatch(input)
      : pickControlCenterPatch(input);

    if (options?.technicianFieldNotesOnly) {
      assertTechnicianPatchAllowed(input);
    }

    const existing = await loadServiceCallDto(organizationId, serviceCallId);

    const nextCustomerId = patchInput.customerId ?? existing.customerId;
    const nextEquipmentId = patchInput.equipmentId ?? existing.equipmentId;

    if (patchInput.customerId !== undefined || patchInput.equipmentId !== undefined) {
      await validateCustomerEquipmentLink(organizationId, nextCustomerId, nextEquipmentId);
    }

    if (patchInput.branchId) {
      await assertBranchInOrganization(organizationId, patchInput.branchId);
    }

    const data: Prisma.ServiceCallUpdateInput = {
      ...(patchInput.serviceCallNumber !== undefined
        ? { serviceCallNumber: patchInput.serviceCallNumber }
        : {}),
      ...(patchInput.title !== undefined ? { title: patchInput.title } : {}),
      ...(patchInput.description !== undefined ? { description: patchInput.description } : {}),
      ...(patchInput.priority !== undefined
        ? { priority: fromServiceCallPriorityDto(patchInput.priority) }
        : {}),
      ...(patchInput.openedAt !== undefined ? { openedAt: parseDate(patchInput.openedAt) } : {}),
      ...(patchInput.scheduledAt !== undefined
        ? {
            scheduledAt: patchInput.scheduledAt === null ? null : parseDate(patchInput.scheduledAt),
          }
        : {}),
      ...(patchInput.customerId !== undefined ? { customerId: patchInput.customerId } : {}),
      ...(patchInput.equipmentId !== undefined ? { equipmentId: patchInput.equipmentId } : {}),
      ...(patchInput.branchId !== undefined
        ? patchInput.branchId === null
          ? { branch: { disconnect: true } }
          : { branch: { connect: { id: patchInput.branchId } } }
        : {}),
      ...(patchInput.contactName !== undefined ? { contactName: patchInput.contactName } : {}),
      ...(patchInput.contactPhone !== undefined ? { contactPhone: patchInput.contactPhone } : {}),
      ...(patchInput.location !== undefined ? { location: patchInput.location } : {}),
      ...(patchInput.notes !== undefined ? { notes: patchInput.notes } : {}),
    };

    try {
      const dto = await prisma.$transaction(async (tx) => {
        const serviceCall = await tx.serviceCall.update({
          where: { id: serviceCallId },
          data,
          include: serviceCallInclude,
        });

        const updated = toServiceCallDto(serviceCall);
        const eventStore = new PrismaWorkflowEventStore(tx);
        await workflow.syncAfterUpdate(existing, updated, actorId, { eventStore });
        return updated;
      });

      await writeAuditLog({
        organizationId,
        actorId,
        action: "service_call.updated",
        entityType: "ServiceCall",
        entityId: dto.id,
        metadata: { fields: Object.keys(patchInput) },
      });

      return dto;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw conflict("Service call number already exists in this organization", {
          serviceCallNumber: patchInput.serviceCallNumber,
        });
      }
      throw mapWorkflowError(error);
    }
  }

  async function softDeleteServiceCall(
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

  return {
    assertAssignedServiceCallAccess,
    listAssignableUsers,
    listServiceCalls,
    getServiceCallById,
    reconcileServiceCallWorkflow,
    createServiceCall,
    updateServiceCall,
    softDeleteServiceCall,
    getServiceCallLifecycle: lifecycle.getServiceCallLifecycle,
    assignTechnician: lifecycle.assignTechnician,
    transitionServiceCallLifecycle: lifecycle.transitionLifecycle,
    closeServiceCallLifecycle: lifecycle.closeServiceCall,
    startVisitDriving: lifecycle.startVisitDriving,
    startVisitWorking: lifecycle.startVisitWorking,
    finishVisit: lifecycle.finishVisit,
  };
}

export type ServiceCallService = ReturnType<typeof createServiceCallService>;

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

async function validateCustomerEquipmentLink(
  organizationId: string,
  customerId: string,
  equipmentId: string,
): Promise<void> {
  await assertCustomerInOrganization(organizationId, customerId);
  const equipment = await assertEquipmentInOrganization(organizationId, equipmentId);
  assertEquipmentMatchesCustomer(equipment, customerId);
}
