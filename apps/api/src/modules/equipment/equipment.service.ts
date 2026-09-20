import type {
  ApiMeta,
  Equipment,
  EquipmentDetail,
  EquipmentCatalogModel,
  EquipmentManufacturer,
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
  toEquipmentCatalogModelDto,
  toEquipmentManufacturerDto,
  toEquipmentTypeDto,
} from "../../lib/mappers.js";
import { paginationMeta, parsePagination } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { assertOrganizationExists } from "../organizations/organization.service.js";
import { buildEquipmentListWhere } from "./equipment-filters.js";
import type {
  CreateEquipmentCatalogModelInput,
  CreateEquipmentInput,
  CreateEquipmentManufacturerInput,
  CreateEquipmentTypeInput,
  UpdateEquipmentInput,
} from "./equipment.schemas.js";

const DEFAULT_EQUIPMENT_TYPES = [
  ["באגר", "EXCAVATOR"],
  ["שופל", "WHEEL_LOADER"],
  ["מיני מעמיס", "SKID_STEER"],
  ["מיני באגר", "MINI_EXCAVATOR"],
  ["פרקית", "ARTICULATED_DUMP_TRUCK"],
  ["מוביל עפר מחצבה", "QUARRY_EARTH_HAULER"],
  ["מנוף", "MOBILE_CRANE"],
  ["מלגזה", "FORKLIFT"],
  ["מכונת קידוח", "DRILLING_MACHINE"],
  ["מעמיס טלסקופי", "TELEHANDLER"],
  ["טאג", "TAG"],
  ["משאית כביש", "ROAD_TRUCK"],
  ["גנרטור", "GENERATOR"],
  ["מכבש", "ROLLER"],
] as const;

const DEFAULT_MANUFACTURERS = [
  "קטרפילר",
  "וולוו",
  "קומטסו",
  "היטאצ׳י",
  "JCB",
  "בובקט",
  "דוסאן",
  "יונדאי",
  "ליבהר",
  "BOMAG",
  "Ammann",
  "CASE",
  "Develon",
] as const;

function catalogKey(value: string): string {
  return value.trim().normalize("NFKC").toLocaleLowerCase();
}

function catalogTypeCode(name: string): string {
  return `catalog-${catalogKey(name)}`;
}

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

async function assertCustomerSiteInOrganization(
  organizationId: string,
  customerSiteId: string,
  customerId?: string,
): Promise<void> {
  const site = await prisma.customerSite.findFirst({
    where: { id: customerSiteId, organizationId, deletedAt: null },
    select: { customerId: true },
  });
  if (!site || (customerId && site.customerId !== customerId)) {
    throw notFound("CustomerSite", customerSiteId);
  }
}

interface CatalogSelection {
  manufacturerId?: string;
  manufacturer?: string;
  modelId?: string;
  model?: string;
}

async function resolveCatalogSelection(
  organizationId: string,
  equipmentTypeId: string,
  input: {
    manufacturerId?: string | null;
    modelId?: string | null;
    manufacturer?: string | null;
    model?: string | null;
  },
): Promise<CatalogSelection> {
  if (input.modelId && !input.manufacturerId) {
    throw conflict("A manufacturer must be selected before selecting a model");
  }

  if (input.manufacturerId) {
    const manufacturer = await prisma.equipmentManufacturer.findFirst({
      where: { id: input.manufacturerId, organizationId, ...activeOnly },
      select: { id: true, name: true },
    });
    if (!manufacturer) {
      throw notFound("EquipmentManufacturer", input.manufacturerId);
    }

    if (input.modelId) {
      const model = await prisma.equipmentCatalogModel.findFirst({
        where: {
          id: input.modelId,
          organizationId,
          equipmentManufacturerId: manufacturer.id,
          equipmentTypeId,
          ...activeOnly,
        },
        select: { id: true, name: true },
      });
      if (!model) {
        throw notFound("EquipmentCatalogModel", input.modelId);
      }
      return {
        manufacturerId: manufacturer.id,
        manufacturer: manufacturer.name,
        modelId: model.id,
        model: model.name,
      };
    }

    return { manufacturerId: manufacturer.id, manufacturer: manufacturer.name };
  }

  return {
    manufacturer: input.manufacturer ?? undefined,
    model: input.model ?? undefined,
  };
}

export async function listEquipmentTypes(organizationId: string): Promise<EquipmentType[]> {
  await assertOrganizationExists(organizationId);

  const types = await prisma.equipmentType.findMany({
    where: { organizationId, ...activeOnly },
    orderBy: { name: "asc" },
  });

  return types.map(toEquipmentTypeDto);
}

export async function createEquipmentType(
  organizationId: string,
  input: CreateEquipmentTypeInput,
  actorId?: string,
): Promise<EquipmentType> {
  await assertOrganizationExists(organizationId);
  const code = catalogTypeCode(input.name);

  try {
    const equipmentType = await prisma.equipmentType.create({
      data: { organizationId, name: input.name, code, description: input.description },
    });
    await writeAuditLog({
      organizationId,
      actorId,
      action: "equipment_type.created",
      entityType: "EquipmentType",
      entityId: equipmentType.id,
      metadata: { name: equipmentType.name, code: equipmentType.code },
    });
    return toEquipmentTypeDto(equipmentType);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Equipment type already exists in this organization", { name: input.name });
    }
    throw error;
  }
}

export async function listEquipmentManufacturers(
  organizationId: string,
): Promise<EquipmentManufacturer[]> {
  await assertOrganizationExists(organizationId);
  const manufacturers = await prisma.equipmentManufacturer.findMany({
    where: { organizationId, ...activeOnly },
    orderBy: { name: "asc" },
  });
  return manufacturers.map(toEquipmentManufacturerDto);
}

export async function createEquipmentManufacturer(
  organizationId: string,
  input: CreateEquipmentManufacturerInput,
  actorId?: string,
): Promise<EquipmentManufacturer> {
  await assertOrganizationExists(organizationId);
  try {
    const manufacturer = await prisma.equipmentManufacturer.create({
      data: { organizationId, name: input.name, key: catalogKey(input.name) },
    });
    await writeAuditLog({
      organizationId,
      actorId,
      action: "equipment_manufacturer.created",
      entityType: "EquipmentManufacturer",
      entityId: manufacturer.id,
      metadata: { name: manufacturer.name },
    });
    return toEquipmentManufacturerDto(manufacturer);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Manufacturer already exists in this organization", { name: input.name });
    }
    throw error;
  }
}

export async function listEquipmentCatalogModels(
  organizationId: string,
  equipmentManufacturerId?: string,
  equipmentTypeId?: string,
): Promise<EquipmentCatalogModel[]> {
  await assertOrganizationExists(organizationId);
  const models = await prisma.equipmentCatalogModel.findMany({
    where: {
      organizationId,
      ...activeOnly,
      ...(equipmentManufacturerId ? { equipmentManufacturerId } : {}),
      ...(equipmentTypeId ? { equipmentTypeId } : {}),
    },
    orderBy: { name: "asc" },
  });
  return models.map(toEquipmentCatalogModelDto);
}

export async function createEquipmentCatalogModel(
  organizationId: string,
  input: CreateEquipmentCatalogModelInput,
  actorId?: string,
): Promise<EquipmentCatalogModel> {
  await assertEquipmentTypeExists(organizationId, input.equipmentTypeId);
  const manufacturer = await prisma.equipmentManufacturer.findFirst({
    where: { id: input.equipmentManufacturerId, organizationId, ...activeOnly },
    select: { id: true },
  });
  if (!manufacturer) {
    throw notFound("EquipmentManufacturer", input.equipmentManufacturerId);
  }

  try {
    const model = await prisma.equipmentCatalogModel.create({
      data: {
        organizationId,
        equipmentManufacturerId: input.equipmentManufacturerId,
        equipmentTypeId: input.equipmentTypeId,
        name: input.name,
        key: catalogKey(input.name),
      },
    });
    await writeAuditLog({
      organizationId,
      actorId,
      action: "equipment_model.created",
      entityType: "EquipmentCatalogModel",
      entityId: model.id,
      metadata: { name: model.name, equipmentTypeId: model.equipmentTypeId },
    });
    return toEquipmentCatalogModelDto(model);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Equipment model already exists for this manufacturer and type", {
        name: input.name,
      });
    }
    throw error;
  }
}

export async function loadDefaultEquipmentCatalog(
  organizationId: string,
  actorId?: string,
): Promise<{ equipmentTypesAdded: number; manufacturersAdded: number }> {
  await assertOrganizationExists(organizationId);
  let equipmentTypesAdded = 0;
  let manufacturersAdded = 0;

  for (const [name, code] of DEFAULT_EQUIPMENT_TYPES) {
    const existing = await prisma.equipmentType.findFirst({
      where: { organizationId, code, ...activeOnly },
      select: { id: true },
    });
    if (!existing) {
      await prisma.equipmentType.create({ data: { organizationId, name, code } });
      equipmentTypesAdded += 1;
    } else {
      await prisma.equipmentType.update({ where: { id: existing.id }, data: { name } });
    }
  }

  for (const name of DEFAULT_MANUFACTURERS) {
    const key = catalogKey(name);
    const existing = await prisma.equipmentManufacturer.findFirst({
      where: { organizationId, key, ...activeOnly },
      select: { id: true },
    });
    if (!existing) {
      await prisma.equipmentManufacturer.create({ data: { organizationId, name, key } });
      manufacturersAdded += 1;
    }
  }

  await writeAuditLog({
    organizationId,
    actorId,
    action: "equipment_catalog.defaults_loaded",
    entityType: "Organization",
    entityId: organizationId,
    metadata: { equipmentTypesAdded, manufacturersAdded },
  });
  return { equipmentTypesAdded, manufacturersAdded };
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
  catalog: CatalogSelection,
): Prisma.EquipmentCreateInput {
  return {
    organization: { connect: { id: organizationId } },
    equipmentType: { connect: { id: input.equipmentTypeId } },
    ...(input.customerId ? { customer: { connect: { id: input.customerId } } } : {}),
    ...(input.customerSiteId ? { customerSite: { connect: { id: input.customerSiteId } } } : {}),
    ...(input.branchId ? { branch: { connect: { id: input.branchId } } } : {}),
    name: input.name,
    internalNumber: input.internalNumber,
    serialNumber: input.serialNumber,
    manufacturer: catalog.manufacturer,
    model: catalog.model,
    ...(catalog.manufacturerId
      ? { manufacturerRef: { connect: { id: catalog.manufacturerId } } }
      : {}),
    ...(catalog.modelId ? { modelRef: { connect: { id: catalog.modelId } } } : {}),
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
  const catalog = await resolveCatalogSelection(organizationId, input.equipmentTypeId, input);

  if (input.customerId) {
    await assertCustomerInOrganization(organizationId, input.customerId);
  }
  if (input.customerSiteId) {
    await assertCustomerSiteInOrganization(organizationId, input.customerSiteId, input.customerId);
  }

  if (input.branchId) {
    await assertBranchInOrganization(organizationId, input.branchId);
  }

  try {
    const equipment = await prisma.equipment.create({
      data: buildCreateData(organizationId, input, catalog),
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
  const existing = await getEquipmentById(organizationId, equipmentId);

  if (input.equipmentTypeId) {
    await assertEquipmentTypeExists(organizationId, input.equipmentTypeId);
  }

  if (input.customerId) {
    await assertCustomerInOrganization(organizationId, input.customerId);
  }
  if (input.customerSiteId) {
    await assertCustomerSiteInOrganization(
      organizationId,
      input.customerSiteId,
      input.customerId ?? existing.customerId,
    );
  }

  if (input.branchId) {
    await assertBranchInOrganization(organizationId, input.branchId);
  }

  const nextEquipmentTypeId = input.equipmentTypeId ?? existing.equipmentTypeId;
  const manufacturerWasChanged = input.manufacturerId !== undefined;
  const nextManufacturerId = manufacturerWasChanged
    ? input.manufacturerId
    : (existing.manufacturerId ?? undefined);
  const nextModelId =
    input.modelId !== undefined
      ? input.modelId
      : manufacturerWasChanged
        ? undefined
        : (existing.modelId ?? undefined);
  const catalog = await resolveCatalogSelection(organizationId, nextEquipmentTypeId, {
    manufacturerId: nextManufacturerId,
    modelId: nextModelId,
    manufacturer:
      input.manufacturerId === null
        ? null
        : input.manufacturer !== undefined
          ? input.manufacturer
          : (existing.manufacturer ?? undefined),
    model:
      input.manufacturerId === null || input.modelId === null
        ? null
        : input.model !== undefined
          ? input.model
          : (existing.model ?? undefined),
  });

  const data: Prisma.EquipmentUpdateInput = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.internalNumber !== undefined ? { internalNumber: input.internalNumber } : {}),
    ...(input.serialNumber !== undefined ? { serialNumber: input.serialNumber } : {}),
    ...(input.manufacturerId !== undefined || input.manufacturer !== undefined
      ? { manufacturer: catalog.manufacturer ?? null }
      : {}),
    ...(input.modelId !== undefined || input.model !== undefined || manufacturerWasChanged
      ? { model: catalog.model ?? null }
      : {}),
    ...(input.manufacturerId !== undefined
      ? catalog.manufacturerId
        ? { manufacturerRef: { connect: { id: catalog.manufacturerId } } }
        : { manufacturerRef: { disconnect: true } }
      : {}),
    ...(input.modelId !== undefined || manufacturerWasChanged
      ? catalog.modelId
        ? { modelRef: { connect: { id: catalog.modelId } } }
        : { modelRef: { disconnect: true } }
      : {}),
    ...(input.year !== undefined ? { year: input.year } : {}),
    ...(input.equipmentTypeId !== undefined
      ? { equipmentType: { connect: { id: input.equipmentTypeId } } }
      : {}),
    ...(input.customerId !== undefined
      ? input.customerId === null
        ? { customer: { disconnect: true } }
        : { customer: { connect: { id: input.customerId } } }
        : {}),
    ...(input.customerSiteId !== undefined
      ? input.customerSiteId === null
        ? { customerSite: { disconnect: true } }
        : { customerSite: { connect: { id: input.customerSiteId } } }
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

export interface RemoveEquipmentResult {
  action: "deleted" | "retired";
  serviceCallCount: number;
}

export async function removeEquipmentFromFleet(
  organizationId: string,
  equipmentId: string,
  actorId?: string,
): Promise<RemoveEquipmentResult> {
  const equipment = await getEquipmentById(organizationId, equipmentId);
  const serviceCallCount = await prisma.serviceCall.count({
    where: { organizationId, equipmentId },
  });

  if (serviceCallCount > 0) {
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: { status: "RETIRED" },
    });

    await writeAuditLog({
      organizationId,
      actorId,
      action: "equipment.removed_from_fleet",
      entityType: "Equipment",
      entityId: equipmentId,
      metadata: {
        internalNumber: equipment.internalNumber,
        name: equipment.name,
        serviceCallCount,
        preservedForHistory: true,
      },
    });

    return { action: "retired", serviceCallCount };
  }

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
      serviceCallCount,
    },
  });

  return { action: "deleted", serviceCallCount };
}
