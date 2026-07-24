import type { ApiMeta, Company } from "@amarok-one/types";
import { Prisma } from "@prisma/client";
import { conflict, notFound } from "../../lib/errors.js";
import { activeOnly, toCompanyDto } from "../../lib/mappers.js";
import { paginationMeta, parsePagination } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { assertOrganizationExists } from "../organizations/organization.service.js";
import type { CreateCompanyInput, UpdateCompanyInput } from "./company.schemas.js";

export async function listCompanies(
  organizationId: string,
  pageValue?: string,
  pageSizeValue?: string,
) {
  await assertOrganizationExists(organizationId);

  const { page, pageSize, skip } = parsePagination(pageValue, pageSizeValue);

  const where = { organizationId, ...activeOnly };

  const [items, total] = await prisma.$transaction([
    prisma.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.company.count({ where }),
  ]);

  const meta: ApiMeta = paginationMeta(total, page, pageSize);
  const data: Company[] = items.map(toCompanyDto);

  return { data, meta };
}

export async function getCompanyById(organizationId: string, companyId: string): Promise<Company> {
  const company = await prisma.company.findFirst({
    where: { id: companyId, organizationId, ...activeOnly },
  });

  if (!company) {
    throw notFound("Company", companyId);
  }

  return toCompanyDto(company);
}

export async function createCompany(
  organizationId: string,
  input: CreateCompanyInput,
): Promise<Company> {
  await assertOrganizationExists(organizationId);

  try {
    const company = await prisma.company.create({
      data: {
        organizationId,
        name: input.name,
        code: input.code,
        legalName: input.legalName,
        taxId: input.taxId,
      },
    });

    return toCompanyDto(company);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Company code already exists in this organization", { code: input.code });
    }
    throw error;
  }
}

export async function updateCompany(
  organizationId: string,
  companyId: string,
  input: UpdateCompanyInput,
): Promise<Company> {
  await getCompanyById(organizationId, companyId);

  try {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: input,
    });

    return toCompanyDto(company);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Company code already exists in this organization", { code: input.code });
    }
    throw error;
  }
}

export async function softDeleteCompany(organizationId: string, companyId: string): Promise<void> {
  await getCompanyById(organizationId, companyId);

  await prisma.$transaction([
    prisma.branch.updateMany({
      where: { companyId, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    }),
    prisma.company.update({
      where: { id: companyId },
      data: { deletedAt: new Date() },
    }),
  ]);
}

export async function assertCompanyExists(
  organizationId: string,
  companyId: string,
): Promise<void> {
  const company = await prisma.company.findFirst({
    where: { id: companyId, organizationId, ...activeOnly },
    select: { id: true },
  });

  if (!company) {
    throw notFound("Company", companyId);
  }
}
