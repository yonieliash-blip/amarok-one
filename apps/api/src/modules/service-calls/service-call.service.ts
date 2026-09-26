import type {
  ApiMeta,
  InventoryLocationSummary,
  InventoryItem,
  OrganizationMember,
  ServiceCallWorkReport,
  ServiceCall,
  ServiceCallPriority,
  ServiceCallStatus,
  TechnicianCurrentTask,
  WorkReportEditorData,
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
  toVisitDto,
  type ServiceCallLifecycleServiceDeps,
} from "./service-call-lifecycle.service.js";
import type { SaveWorkReportInput } from "./service-call-lifecycle.schemas.js";

export interface ServiceCallServiceDeps extends ServiceCallLifecycleServiceDeps {
  workflow: ServiceCallWorkflowPort;
}

const currentTaskStatusPriority: Record<string, number> = {
  WORKING: 6,
  IN_PROGRESS: 5,
  CHECKED_IN: 4,
  DRIVING: 3,
  ASSIGNED: 2,
  PLANNED: 1,
};

function toInventoryLocationDto(row: {
  id: string;
  organizationId: string;
  name: string;
  type: "SERVICE_VAN" | "CENTRAL_WAREHOUSE";
  assignedUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignedUser?: { displayName: string } | null;
}): InventoryLocationSummary {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    type: row.type === "SERVICE_VAN" ? "service_van" : "central_warehouse",
    assignedUserId: row.assignedUserId ?? undefined,
    assignedUserName: row.assignedUser?.displayName ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toInventoryItemDto(row: {
  id: string;
  organizationId: string;
  locationId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  part: {
    id: string;
    organizationId: string;
    categoryId: string;
    subcategoryId: string;
    name: string;
    partNumber: string | null;
    createdAt: Date;
    updatedAt: Date;
    category: { id: string; name: string };
    subcategory: { id: string; name: string };
  };
  location?: {
    id: string;
    organizationId: string;
    name: string;
    type: "SERVICE_VAN" | "CENTRAL_WAREHOUSE";
    assignedUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    assignedUser?: { displayName: string } | null;
  };
}): InventoryItem {
  return {
    id: row.id,
    organizationId: row.organizationId,
    locationId: row.locationId,
    quantity: row.quantity,
    partId: row.part.id,
    part: {
      id: row.part.id,
      organizationId: row.part.organizationId,
      categoryId: row.part.categoryId,
      subcategoryId: row.part.subcategoryId,
      name: row.part.name,
      partNumber: row.part.partNumber ?? undefined,
      category: row.part.category,
      subcategory: row.part.subcategory,
      createdAt: row.part.createdAt.toISOString(),
      updatedAt: row.part.updatedAt.toISOString(),
    },
    location: row.location ? toInventoryLocationDto(row.location) : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toWorkReportDto(row: {
  id: string;
  organizationId: string;
  serviceCallId: string;
  visitId: string;
  technicianId: string;
  workPerformed: string | null;
  customerName: string | null;
  customerSignatureData: string | null;
  signedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  parts: Array<{
    id: string;
    inventoryItemId: string;
    catalogPartId: string;
    quantity: number;
    inventoryItem: {
      id: string;
      organizationId: string;
      locationId: string;
      quantity: number;
      createdAt: Date;
      updatedAt: Date;
      part: {
        id: string;
        organizationId: string;
        categoryId: string;
        subcategoryId: string;
        name: string;
        partNumber: string | null;
        createdAt: Date;
        updatedAt: Date;
        category: { id: string; name: string };
        subcategory: { id: string; name: string };
      };
      location: {
        id: string;
        organizationId: string;
        name: string;
        type: "SERVICE_VAN" | "CENTRAL_WAREHOUSE";
        assignedUserId: string | null;
        createdAt: Date;
        updatedAt: Date;
        assignedUser?: { displayName: string } | null;
      };
    };
  }>;
}): ServiceCallWorkReport {
  return {
    id: row.id,
    organizationId: row.organizationId,
    serviceCallId: row.serviceCallId,
    visitId: row.visitId,
    technicianId: row.technicianId,
    workPerformed: row.workPerformed ?? undefined,
    customerName: row.customerName ?? undefined,
    customerSignatureData: row.customerSignatureData ?? undefined,
    signedAt: row.signedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    parts: row.parts.map((part) => ({
      id: part.id,
      inventoryItemId: part.inventoryItemId,
      catalogPartId: part.catalogPartId,
      quantity: part.quantity,
      inventoryItem: toInventoryItemDto(part.inventoryItem),
      catalogPart: toInventoryItemDto(part.inventoryItem).part,
    })),
  };
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
        role: { slug: "technician", deletedAt: null },
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

  async function getTechnicianCurrentTask(
    organizationId: string,
    technicianId: string,
  ): Promise<TechnicianCurrentTask | null> {
    await assertOrganizationExists(organizationId);
    const visits = await prisma.serviceCallVisit.findMany({
      where: {
        organizationId,
        technicianId,
        deletedAt: null,
        status: { in: ["ASSIGNED", "DRIVING", "WORKING", "PLANNED", "CHECKED_IN", "IN_PROGRESS"] },
        serviceCall: { deletedAt: null, lifecycleState: { not: "CLOSED" } },
      },
      include: {
        technician: { select: { id: true, email: true, displayName: true } },
        serviceCall: { include: serviceCallInclude },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 100,
    });

    const visit = visits.sort(
      (left, right) =>
        (currentTaskStatusPriority[right.status] ?? 0) -
        (currentTaskStatusPriority[left.status] ?? 0),
    )[0];
    if (!visit) return null;
    return {
      serviceCall: toServiceCallDto(visit.serviceCall),
      visit: toVisitDto(visit),
    };
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

  async function getWorkReportEditor(
    organizationId: string,
    serviceCallId: string,
    visitId: string,
  ): Promise<WorkReportEditorData> {
    const visit = await prisma.serviceCallVisit.findFirst({
      where: {
        id: visitId,
        serviceCallId,
        organizationId,
        deletedAt: null,
        serviceCall: { deletedAt: null },
      },
      select: {
        id: true,
        technicianId: true,
      },
    });

    if (!visit) {
      throw notFound("ServiceCallVisit", visitId);
    }

    const assignedVan = await prisma.inventoryLocation.findFirst({
      where: {
        organizationId,
        type: "SERVICE_VAN",
        assignedUserId: visit.technicianId,
        deletedAt: null,
      },
      include: {
        assignedUser: { select: { displayName: true } },
      },
    });

    if (!assignedVan) {
      throw badRequest("לא משויכת לטכנאי ניידת שירות.");
    }

    const report = await prisma.serviceCallWorkReport.findFirst({
      where: {
        organizationId,
        serviceCallId,
        visitId,
        deletedAt: null,
      },
      include: {
        parts: {
          include: {
            inventoryItem: {
              include: {
                location: {
                  include: {
                    assignedUser: { select: { displayName: true } },
                  },
                },
                part: {
                  include: {
                    category: { select: { id: true, name: true } },
                    subcategory: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        organizationId,
        locationId: assignedVan.id,
        deletedAt: null,
      },
      include: {
        location: {
          include: {
            assignedUser: { select: { displayName: true } },
          },
        },
        part: {
          include: {
            category: { select: { id: true, name: true } },
            subcategory: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [
        { part: { category: { name: "asc" } } },
        { part: { subcategory: { name: "asc" } } },
        { part: { name: "asc" } },
      ],
    });

    const visibleItems = new Map<string, (typeof inventoryItems)[number]>();
    for (const item of inventoryItems) {
      if (item.quantity > 0) {
        visibleItems.set(item.id, item);
      }
    }
    for (const part of report?.parts ?? []) {
      visibleItems.set(part.inventoryItem.id, part.inventoryItem);
    }

    const groups = new Map<string, WorkReportEditorData["partGroups"][number]>();
    for (const item of visibleItems.values()) {
      const key = `${item.part.categoryId}:${item.part.subcategoryId}`;
      const existingGroup = groups.get(key);
      const option = {
        inventoryItemId: item.id,
        availableQuantity: item.quantity,
        inventoryItem: toInventoryItemDto(item),
      };
      if (existingGroup) {
        existingGroup.items.push(option);
        continue;
      }

      groups.set(key, {
        category: item.part.category,
        subcategory: item.part.subcategory,
        items: [option],
      });
    }

    return {
      assignedVan: toInventoryLocationDto(assignedVan),
      report: report ? toWorkReportDto(report) : undefined,
      partGroups: [...groups.values()],
    };
  }

  async function saveWorkReport(
    organizationId: string,
    serviceCallId: string,
    visitId: string,
    input: SaveWorkReportInput,
    actorId?: string,
  ): Promise<ServiceCallWorkReport> {
    const visit = await prisma.serviceCallVisit.findFirst({
      where: {
        id: visitId,
        serviceCallId,
        organizationId,
        deletedAt: null,
        serviceCall: { deletedAt: null },
      },
      select: {
        id: true,
        technicianId: true,
      },
    });

    if (!visit) {
      throw notFound("ServiceCallVisit", visitId);
    }

    const assignedVan = await prisma.inventoryLocation.findFirst({
      where: {
        organizationId,
        type: "SERVICE_VAN",
        assignedUserId: visit.technicianId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!assignedVan) {
      throw badRequest("לא משויכת לטכנאי ניידת שירות.");
    }

    const aggregatedParts = [
      ...input.parts
        .reduce((map, entry) => {
          map.set(entry.inventoryItemId, (map.get(entry.inventoryItemId) ?? 0) + entry.quantity);
          return map;
        }, new Map<string, number>())
        .entries(),
    ].map(([inventoryItemId, quantity]) => ({
      inventoryItemId,
      quantity,
    }));

    const saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceCallWorkReport.findFirst({
        where: {
          organizationId,
          serviceCallId,
          visitId,
          deletedAt: null,
        },
        include: {
          parts: true,
        },
      });

      if (existing) {
        for (const previousPart of existing.parts) {
          await tx.inventoryItem.update({
            where: { id: previousPart.inventoryItemId, organizationId },
            data: { quantity: { increment: previousPart.quantity } },
          });
        }

        await tx.serviceCallWorkReportPart.deleteMany({
          where: { workReportId: existing.id },
        });
      }

      const report = existing
        ? await tx.serviceCallWorkReport.update({
            where: { id: existing.id, organizationId },
            data: {
              workPerformed: input.workPerformed ?? null,
              customerName: input.customerName ?? null,
              customerSignatureData: input.customerSignatureData ?? null,
              signedAt: input.customerSignatureData ? new Date() : null,
            },
          })
        : await tx.serviceCallWorkReport.create({
            data: {
              organizationId,
              serviceCallId,
              visitId,
              technicianId: visit.technicianId,
              workPerformed: input.workPerformed ?? null,
              customerName: input.customerName ?? null,
              customerSignatureData: input.customerSignatureData ?? null,
              signedAt: input.customerSignatureData ? new Date() : null,
            },
          });

      if (aggregatedParts.length > 0) {
        const inventoryRows = await tx.inventoryItem.findMany({
          where: {
            organizationId,
            deletedAt: null,
            locationId: assignedVan.id,
            id: { in: aggregatedParts.map((part) => part.inventoryItemId) },
          },
          select: {
            id: true,
            partId: true,
          },
        });

        if (inventoryRows.length !== aggregatedParts.length) {
          throw badRequest("ניתן לבחור חלקים רק מהמלאי של הניידת המשויכת.");
        }

        const partIdByInventoryId = new Map(inventoryRows.map((row) => [row.id, row.partId]));

        for (const part of aggregatedParts) {
          const updated = await tx.inventoryItem.updateMany({
            where: {
              id: part.inventoryItemId,
              organizationId,
              locationId: assignedVan.id,
              deletedAt: null,
              quantity: { gte: part.quantity },
            },
            data: {
              quantity: { decrement: part.quantity },
            },
          });

          if (updated.count !== 1) {
            throw badRequest("אין מספיק מלאי בניידת עבור אחד או יותר מהחלקים שנבחרו.");
          }

          await tx.serviceCallWorkReportPart.create({
            data: {
              workReportId: report.id,
              inventoryItemId: part.inventoryItemId,
              catalogPartId: partIdByInventoryId.get(part.inventoryItemId)!,
              quantity: part.quantity,
            },
          });
        }
      }

      return tx.serviceCallWorkReport.findFirstOrThrow({
        where: {
          id: report.id,
          organizationId,
        },
        include: {
          parts: {
            include: {
              inventoryItem: {
                include: {
                  location: {
                    include: {
                      assignedUser: { select: { displayName: true } },
                    },
                  },
                  part: {
                    include: {
                      category: { select: { id: true, name: true } },
                      subcategory: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    await writeAuditLog({
      organizationId,
      actorId,
      action: "service_call.work_report.saved",
      entityType: "ServiceCallWorkReport",
      entityId: saved.id,
      metadata: {
        serviceCallId,
        visitId,
        partCount: aggregatedParts.length,
      },
    });

    return toWorkReportDto(saved);
  }

  return {
    assertAssignedServiceCallAccess,
    listAssignableUsers,
    listServiceCalls,
    getServiceCallById,
    getTechnicianCurrentTask,
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
    getWorkReportEditor,
    saveWorkReport,
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
