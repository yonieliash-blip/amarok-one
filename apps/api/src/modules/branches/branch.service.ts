import type { ApiMeta, Branch } from "@amarok-one/types";
import { Prisma } from "@prisma/client";
import { conflict, notFound } from "../../lib/errors.js";
import { activeOnly, toBranchDto } from "../../lib/mappers.js";
import { paginationMeta, parsePagination } from "../../lib/pagination.js";
import { prisma } from "../../lib/prisma.js";
import { assertCompanyExists } from "../companies/company.service.js";
import { assertOrganizationExists } from "../organizations/organization.service.js";
import type { CreateBranchInput, UpdateBranchInput } from "./branch.schemas.js";

export async function listBranches(
  organizationId: string,
  companyId: string,
  pageValue?: string,
  pageSizeValue?: string,
) {
  await assertOrganizationExists(organizationId);
  await assertCompanyExists(organizationId, companyId);

  const { page, pageSize, skip } = parsePagination(pageValue, pageSizeValue);
  const where = { organizationId, companyId, ...activeOnly };

  const [items, total] = await prisma.$transaction([
    prisma.branch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.branch.count({ where }),
  ]);

  const meta: ApiMeta = paginationMeta(total, page, pageSize);
  const data: Branch[] = items.map(toBranchDto);

  return { data, meta };
}

export async function getBranchById(
  organizationId: string,
  companyId: string,
  branchId: string,
): Promise<Branch> {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId, companyId, ...activeOnly },
  });

  if (!branch) {
    throw notFound("Branch", branchId);
  }

  return toBranchDto(branch);
}

export async function createBranch(
  organizationId: string,
  companyId: string,
  input: CreateBranchInput,
): Promise<Branch> {
  await assertOrganizationExists(organizationId);
  await assertCompanyExists(organizationId, companyId);

  try {
    const branch = await prisma.branch.create({
      data: {
        organizationId,
        companyId,
        name: input.name,
        code: input.code,
        addressLine1: input.addressLine1,
        city: input.city,
        country: input.country,
      },
    });

    return toBranchDto(branch);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Branch code already exists for this company", { code: input.code });
    }
    throw error;
  }
}

export async function updateBranch(
  organizationId: string,
  companyId: string,
  branchId: string,
  input: UpdateBranchInput,
): Promise<Branch> {
  await getBranchById(organizationId, companyId, branchId);

  try {
    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: input,
    });

    return toBranchDto(branch);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Branch code already exists for this company", { code: input.code });
    }
    throw error;
  }
}

export async function softDeleteBranch(
  organizationId: string,
  companyId: string,
  branchId: string,
): Promise<void> {
  await getBranchById(organizationId, companyId, branchId);

  await prisma.branch.update({
    where: { id: branchId },
    data: { deletedAt: new Date() },
  });
}
