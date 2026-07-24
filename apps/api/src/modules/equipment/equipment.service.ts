import type {
  ApiMeta,
  Equipment,
  EquipmentDetail,
  EquipmentStatus,
  EquipmentType,
} from "@amarok-one/types";
import { Prisma } from "@prisma/client";
import { writeAuditLog } from "../../lib/audit.js";
import { conflict, notFound } from "../../lib/errors.js";
import {
  activeOnly,
  equipmentInclude,
  fromEquipmentStatusDto,
  toEquipmentDto,
  toEquipmentTypeDto,
} from "../../lib/mappers.js";
import { paginationMeta, parsePagination } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { assertOrganizationExists } from "../organizations/organization.service.js";
import { buildEquipmentListWhere } from "./equipment-filters.js";
import type { CreateEquipmentInput, UpdateEquipmentInput } from "./equipment.schemas.js";

async function assertEquipmentTypeExists(
  organizationId: string,
  equipmentTypeId: string,
): Promise<void> {
  const equipmentType = await prisma.equipmentType.findFirst({
    where: { id: equipmentTypeId, organizationId, ...activeOnly },
    select: { id: true },
  });

  if (!equipmentType) {
    throw notFound("EquipmentType", equipmentTypeId);
  }
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

async function assertBranchInOrganization(organizationId: string, branchId: string): Promise<void> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId, ...activeOnly },
    select: { id: true },
  });

  if (!branch) {
    throw notFound("Branch", branchId);
  }
}

export async function listEquipmentTypes(organizationId: string): Promise<EquipmentType[]> {
  await assertOrganizationExists(organizationId);

  const types = await prisma.equipmentType.findMany({
    where: { organizationId, ...activeOnly },
    orderBy: { name: "asc" },
  });

  return types.map(toEquipmentTypeDto);
}

export async function listEquipment(
  organizationId: string,
  pageValue?: string,
  pageSizeValue?: string,
  search?: string,
  customerId?: string,
  manufacturer?: string,
  model?: string,
  equipmentTypeId?: string,
  status?: EquipmentStatus,
) {
  await assertOrganizationExists(organizationId);

  const { page, pageSize, skip } = parsePagination(pageValue, pageSizeValue);
  const where = buildEquipmentListWhere({
    organizationId,
    search,
    customerId,
    manufacturer,
    model,
    equipmentTypeId,
    status,
  });

  const [items, total] = await prisma.$transaction([
    prisma.equipment.findMany({
      where,
      include: equipmentInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.equipment.count({ where }),
  ]);

  const meta: ApiMeta = paginationMeta(total, page, pageSize);
  const data: Equipment[] = items.map(toEquipmentDto);

  return { data, meta };
}

export async function getEquipmentById(
  organizationId: string,
  equipmentId: string,
): Promise<EquipmentDetail> {
  const equipment = await prisma.equipment.findFirst({
    where: { id: equipmentId, organizationId, ...activeOnly },
    include: equipmentInclude,
  });

  if (!equipment) {
    throw notFound("Equipment", equipmentId);
  }

  return toEquipmentDto(equipment);
}

function buildCreateData(
  organizationId: string,
  input: CreateEquipmentInput,
): Prisma.EquipmentCreateInput {
  return {
    organization: { connect: { id: organizationId } },
    equipmentType: { connect: { id: input.equipmentTypeId } },
    ...(input.customerId ? { customer: { connect: { id: input.customerId } } } : {}),
    ...(input.branchId ? { branch: { connect: { id: input.branchId } } } : {}),
    name: input.name,
    internalNumber: input.internalNumber,
    serialNumber: input.serialNumber,
    manufacturer: input.manufacturer,
    model: input.model,
    year: input.year,
    status: input.status ? fromEquipmentStatusDto(input.status) : undefined,
    engineHours:
      input.engineHours !== undefined ? new Prisma.Decimal(input.engineHours) : undefined,
    mileage: input.mileage,
    registrationNumber: input.registrationNumber,
    warrantyEndDate: input.warrantyEndDate ? new Date(input.warrantyEndDate) : undefined,
    location: input.location,
    notes: input.notes,
  };
}

export async function createEquipment(
  organizationId: string,
  input: CreateEquipmentInput,
  actorId?: string,
): Promise<EquipmentDetail> {
  await assertOrganizationExists(organizationId);
  await assertEquipmentTypeExists(organizationId, input.equipmentTypeId);

  if (input.customerId) {
    await assertCustomerInOrganization(organizationId, input.customerId);
  }

  if (input.branchId) {
    await assertBranchInOrganization(organizationId, input.branchId);
  }

  try {
    const equipment = await prisma.equipment.create({
      data: buildCreateData(organizationId, input),
      include: equipmentInclude,
    });

    await writeAuditLog({
      organizationId,
      actorId,
      action: "equipment.created",
      entityType: "Equipment",
      entityId: equipment.id,
      metadata: {
        internalNumber: equipment.internalNumber,
        name: equipment.name,
      },
    });

    return toEquipmentDto(equipment);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Internal number already exists in this organization", {
        internalNumber: input.internalNumber,
      });
    }
    throw error;
  }
}

export async function updateEquipment(
  organizationId: string,
  equipmentId: string,
  input: UpdateEquipmentInput,
  actorId?: string,
): Promise<EquipmentDetail> {
  await getEquipmentById(organizationId, equipmentId);

  if (input.equipmentTypeId) {
    await assertEquipmentTypeExists(organizationId, input.equipmentTypeId);
  }

  if (input.customerId) {
    await assertCustomerInOrganization(organizationId, input.customerId);
  }

  if (input.branchId) {
    await assertBranchInOrganization(organizationId, input.branchId);
  }

  const data: Prisma.EquipmentUpdateInput = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.internalNumber !== undefined ? { internalNumber: input.internalNumber } : {}),
    ...(input.serialNumber !== undefined ? { serialNumber: input.serialNumber } : {}),
    ...(input.manufacturer !== undefined ? { manufacturer: input.manufacturer } : {}),
    ...(input.model !== undefined ? { model: input.model } : {}),
    ...(input.year !== undefined ? { year: input.year } : {}),
    ...(input.equipmentTypeId !== undefined
      ? { equipmentType: { connect: { id: input.equipmentTypeId } } }
      : {}),
    ...(input.customerId !== undefined
      ? input.customerId === null
        ? { customer: { disconnect: true } }
        : { customer: { connect: { id: input.customerId } } }
      : {}),
    ...(input.branchId !== undefined
      ? input.branchId === null
        ? { branch: { disconnect: true } }
        : { branch: { connect: { id: input.branchId } } }
      : {}),
    ...(input.status !== undefined ? { status: fromEquipmentStatusDto(input.status) } : {}),
    ...(input.engineHours !== undefined
      ? {
          engineHours: input.engineHours === null ? null : new Prisma.Decimal(input.engineHours),
        }
      : {}),
    ...(input.mileage !== undefined ? { mileage: input.mileage } : {}),
    ...(input.registrationNumber !== undefined
      ? { registrationNumber: input.registrationNumber }
      : {}),
    ...(input.warrantyEndDate !== undefined
      ? {
          warrantyEndDate: input.warrantyEndDate === null ? null : new Date(input.warrantyEndDate),
        }
      : {}),
    ...(input.location !== undefined ? { location: input.location } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };

  try {
    const equipment = await prisma.equipment.update({
      where: { id: equipmentId },
      data,
      include: equipmentInclude,
    });

    await writeAuditLog({
      organizationId,
      actorId,
      action: "equipment.updated",
      entityType: "Equipment",
      entityId: equipment.id,
      metadata: { fields: Object.keys(input) },
    });

    return toEquipmentDto(equipment);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Internal number already exists in this organization", {
        internalNumber: input.internalNumber,
      });
    }
    throw error;
  }
}

export async function softDeleteEquipment(
  organizationId: string,
  equipmentId: string,
  actorId?: string,
): Promise<void> {
  const equipment = await getEquipmentById(organizationId, equipmentId);

  await prisma.equipment.update({
    where: { id: equipmentId },
    data: { deletedAt: new Date() },
  });

  await writeAuditLog({
    organizationId,
    actorId,
    action: "equipment.deleted",
    entityType: "Equipment",
    entityId: equipmentId,
    metadata: {
      internalNumber: equipment.internalNumber,
      name: equipment.name,
    },
  });
}
