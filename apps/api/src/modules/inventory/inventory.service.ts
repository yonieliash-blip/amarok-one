import type {
  CatalogPart,
  InventoryItem,
  InventoryLocationDetail,
  InventoryLocationSummary,
  InventoryOverview,
} from "@amarok-one/types";
import { Prisma } from "@prisma/client";
import { writeAuditLog } from "../../lib/audit.js";
import { conflict, notFound } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { assertOrganizationExists } from "../organizations/organization.service.js";
import type { AddInventoryItemInput, CreateInventoryLocationInput } from "./inventory.schemas.js";

function toLocationTypeDto(
  value: "SERVICE_VAN" | "CENTRAL_WAREHOUSE",
): "service_van" | "central_warehouse" {
  return value === "SERVICE_VAN" ? "service_van" : "central_warehouse";
}

function fromLocationTypeDto(
  value: "service_van" | "central_warehouse",
): "SERVICE_VAN" | "CENTRAL_WAREHOUSE" {
  return value === "service_van" ? "SERVICE_VAN" : "CENTRAL_WAREHOUSE";
}

function toCatalogPartDto(row: {
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
}): CatalogPart {
  return {
    id: row.id,
    organizationId: row.organizationId,
    categoryId: row.categoryId,
    subcategoryId: row.subcategoryId,
    name: row.name,
    partNumber: row.partNumber ?? undefined,
    category: row.category,
    subcategory: row.subcategory,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toLocationDto(row: {
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
    type: toLocationTypeDto(row.type),
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
}): InventoryItem {
  return {
    id: row.id,
    organizationId: row.organizationId,
    locationId: row.locationId,
    quantity: row.quantity,
    partId: row.part.id,
    part: toCatalogPartDto(row.part),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listInventoryOverview(organizationId: string): Promise<InventoryOverview> {
  await assertOrganizationExists(organizationId);

  const locations = await prisma.inventoryLocation.findMany({
    where: { organizationId, deletedAt: null },
    include: {
      assignedUser: { select: { displayName: true } },
      items: {
        where: { deletedAt: null },
        include: {
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
      },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const mapped: InventoryLocationDetail[] = locations.map((location) => ({
    ...toLocationDto(location),
    items: location.items.map(toInventoryItemDto),
  }));

  return {
    vans: mapped.filter((location) => location.type === "service_van"),
    warehouses: mapped.filter((location) => location.type === "central_warehouse"),
  };
}

export async function createInventoryLocation(
  organizationId: string,
  input: CreateInventoryLocationInput,
  actorId?: string,
): Promise<InventoryLocationSummary> {
  await assertOrganizationExists(organizationId);
  try {
    const location = await prisma.inventoryLocation.create({
      data: {
        organizationId,
        name: input.name.trim(),
        type: fromLocationTypeDto(input.type),
      },
    });
    await writeAuditLog({
      organizationId,
      actorId,
      action: "inventory.location.created",
      entityType: "InventoryLocation",
      entityId: location.id,
      metadata: { name: location.name, type: input.type },
    });
    return toLocationDto(location);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("מיקום מלאי בשם הזה כבר קיים.");
    }
    throw error;
  }
}

export async function addInventoryItem(
  organizationId: string,
  input: AddInventoryItemInput,
  actorId?: string,
): Promise<InventoryItem> {
  await assertOrganizationExists(organizationId);

  const [location, part] = await Promise.all([
    prisma.inventoryLocation.findFirst({
      where: { id: input.locationId, organizationId, deletedAt: null },
      include: { assignedUser: { select: { displayName: true } } },
    }),
    prisma.catalogPart.findFirst({
      where: { id: input.partId, organizationId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
      },
    }),
  ]);
  if (!location) {
    throw notFound("InventoryLocation", input.locationId);
  }
  if (!part) {
    throw notFound("CatalogPart", input.partId);
  }

  const item = await prisma.$transaction(async (tx) => {
    const existing = await tx.inventoryItem.findFirst({
      where: {
        organizationId,
        locationId: input.locationId,
        partId: input.partId,
        deletedAt: null,
      },
      include: {
        part: {
          include: {
            category: { select: { id: true, name: true } },
            subcategory: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (existing) {
      return tx.inventoryItem.update({
        where: { id: existing.id, organizationId },
        data: { quantity: { increment: input.quantity } },
        include: {
          part: {
            include: {
              category: { select: { id: true, name: true } },
              subcategory: { select: { id: true, name: true } },
            },
          },
        },
      });
    }

    return tx.inventoryItem.create({
      data: {
        organizationId,
        locationId: input.locationId,
        partId: input.partId,
        quantity: input.quantity,
      },
      include: {
        part: {
          include: {
            category: { select: { id: true, name: true } },
            subcategory: { select: { id: true, name: true } },
          },
        },
      },
    });
  });

  await writeAuditLog({
    organizationId,
    actorId,
    action: "inventory.item.stocked",
    entityType: "InventoryItem",
    entityId: item.id,
    metadata: {
      locationId: input.locationId,
      partId: input.partId,
      quantityAdded: input.quantity,
    },
  });

  return {
    ...toInventoryItemDto(item),
    location: toLocationDto(location),
  };
}
