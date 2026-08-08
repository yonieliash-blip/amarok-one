import type { ApiMeta } from "@amarok-one/types";
import type { Organization } from "@amarok-one/types";
import { Prisma } from "@prisma/client";
import { conflict, notFound } from "../../lib/errors.js";
import { activeOnly, toOrganizationDto } from "../../lib/mappers.js";
import { paginationMeta, parsePagination } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import type { CreateOrganizationInput, UpdateOrganizationInput } from "./organization.schemas.js";

export async function listOrganizations(pageValue?: string, pageSizeValue?: string) {
  const { page, pageSize, skip } = parsePagination(pageValue, pageSizeValue);

  const [items, total] = await prisma.$transaction([
    prisma.organization.findMany({
      where: activeOnly,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.organization.count({ where: activeOnly }),
  ]);

  const meta: ApiMeta = paginationMeta(total, page, pageSize);
  const data: Organization[] = items.map(toOrganizationDto);

  return { data, meta };
}

export async function listOrganizationsForTenant(
  organizationId: string,
  pageValue?: string,
  pageSizeValue?: string,
) {
  const { page, pageSize } = parsePagination(pageValue, pageSizeValue);
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, ...activeOnly },
  });

  const data: Organization[] = organization ? [toOrganizationDto(organization)] : [];
  const meta: ApiMeta = paginationMeta(organization ? 1 : 0, page, pageSize);

  return { data, meta };
}

export async function getOrganizationById(id: string): Promise<Organization> {
  const organization = await prisma.organization.findFirst({
    where: { id, ...activeOnly },
  });

  if (!organization) {
    throw notFound("Organization", id);
  }

  return toOrganizationDto(organization);
}

export async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
  try {
    const organization = await prisma.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
      },
    });

    return toOrganizationDto(organization);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Organization slug already exists", { slug: input.slug });
    }
    throw error;
  }
}

export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput,
): Promise<Organization> {
  await getOrganizationById(id);

  try {
    const organization = await prisma.organization.update({
      where: { id },
      data: input,
    });

    return toOrganizationDto(organization);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Organization slug already exists", { slug: input.slug });
    }
    throw error;
  }
}

export async function softDeleteOrganization(id: string): Promise<void> {
  await getOrganizationById(id);

  await prisma.organization.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function assertOrganizationExists(organizationId: string): Promise<void> {
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, ...activeOnly },
    select: { id: true },
  });

  if (!organization) {
    throw notFound("Organization", organizationId);
  }
}
