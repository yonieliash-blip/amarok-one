import type {
  CatalogPart,
  PartCatalogCategoryGroup,
  PartCategory,
  PartSubcategory,
} from "@amarok-one/types";
import { Prisma } from "@prisma/client";
import { writeAuditLog } from "../../lib/audit.js";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { assertOrganizationExists } from "../organizations/organization.service.js";
import type {
  CreateCatalogPartInput,
  CreatePartCategoryInput,
  CreatePartSubcategoryInput,
} from "./parts.schemas.js";

function toCategoryDto(row: {
  id: string;
  organizationId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): PartCategory {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSubcategoryDto(row: {
  id: string;
  organizationId: string;
  categoryId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): PartSubcategory {
  return {
    id: row.id,
    organizationId: row.organizationId,
    categoryId: row.categoryId,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
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
}): CatalogPart {
  return {
    id: row.id,
    organizationId: row.organizationId,
    categoryId: row.categoryId,
    subcategoryId: row.subcategoryId,
    name: row.name,
    partNumber: row.partNumber ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listPartsCatalog(
  organizationId: string,
): Promise<PartCatalogCategoryGroup[]> {
  await assertOrganizationExists(organizationId);

  const categories = await prisma.partCategory.findMany({
    where: {
      organizationId,
      deletedAt: null,
    },
    include: {
      subcategories: {
        where: { deletedAt: null },
        include: {
          catalogParts: {
            where: { deletedAt: null },
            orderBy: [{ name: "asc" }],
          },
        },
        orderBy: [{ name: "asc" }],
      },
    },
    orderBy: [{ name: "asc" }],
  });

  return categories.map((category) => ({
    ...toCategoryDto(category),
    subcategories: category.subcategories.map((subcategory) => ({
      ...toSubcategoryDto(subcategory),
      parts: subcategory.catalogParts.map((part) => ({
        ...toCatalogPartDto(part),
        category: { id: category.id, name: category.name },
        subcategory: { id: subcategory.id, name: subcategory.name },
      })),
    })),
  }));
}

export async function createPartCategory(
  organizationId: string,
  input: CreatePartCategoryInput,
  actorId?: string,
): Promise<PartCategory> {
  await assertOrganizationExists(organizationId);
  try {
    const category = await prisma.partCategory.create({
      data: {
        organizationId,
        name: input.name.trim(),
      },
    });
    await writeAuditLog({
      organizationId,
      actorId,
      action: "parts.category.created",
      entityType: "PartCategory",
      entityId: category.id,
      metadata: { name: category.name },
    });
    return toCategoryDto(category);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("קטגוריה בשם הזה כבר קיימת.");
    }
    throw error;
  }
}

export async function createPartSubcategory(
  organizationId: string,
  input: CreatePartSubcategoryInput,
  actorId?: string,
): Promise<PartSubcategory> {
  await assertOrganizationExists(organizationId);
  const category = await prisma.partCategory.findFirst({
    where: { id: input.categoryId, organizationId, deletedAt: null },
  });
  if (!category) {
    throw notFound("PartCategory", input.categoryId);
  }

  try {
    const subcategory = await prisma.partSubcategory.create({
      data: {
        organizationId,
        categoryId: input.categoryId,
        name: input.name.trim(),
      },
    });
    await writeAuditLog({
      organizationId,
      actorId,
      action: "parts.subcategory.created",
      entityType: "PartSubcategory",
      entityId: subcategory.id,
      metadata: { name: subcategory.name, categoryId: input.categoryId },
    });
    return toSubcategoryDto(subcategory);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("תת-קטגוריה בשם הזה כבר קיימת בקטגוריה.");
    }
    throw error;
  }
}

export async function createCatalogPart(
  organizationId: string,
  input: CreateCatalogPartInput,
  actorId?: string,
): Promise<CatalogPart> {
  await assertOrganizationExists(organizationId);
  const subcategory = await prisma.partSubcategory.findFirst({
    where: { id: input.subcategoryId, organizationId, deletedAt: null },
    include: {
      category: { select: { id: true, name: true } },
    },
  });
  if (!subcategory) {
    throw notFound("PartSubcategory", input.subcategoryId);
  }
  if (subcategory.categoryId !== input.categoryId) {
    throw badRequest("תת-הקטגוריה לא שייכת לקטגוריה שנבחרה.");
  }

  try {
    const part = await prisma.catalogPart.create({
      data: {
        organizationId,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId,
        name: input.name.trim(),
        partNumber: input.partNumber?.trim() || null,
      },
    });
    await writeAuditLog({
      organizationId,
      actorId,
      action: "parts.catalog_part.created",
      entityType: "CatalogPart",
      entityId: part.id,
      metadata: {
        name: part.name,
        partNumber: part.partNumber,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId,
      },
    });
    return {
      ...toCatalogPartDto(part),
      category: { id: subcategory.category.id, name: subcategory.category.name },
      subcategory: { id: input.subcategoryId, name: subcategory.name },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("חלק בשם הזה כבר קיים בתת-הקטגוריה.");
    }
    throw error;
  }
}
