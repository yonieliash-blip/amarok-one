import type { CustomerStatus } from "@amarok-one/types";
import type { Prisma } from "@prisma/client";
import { fromCustomerStatusDto } from "../../lib/mappers.js";

export interface CustomerListFilters {
  organizationId: string;
  search?: string;
  status?: CustomerStatus;
}

export function buildCustomerListWhere(filters: CustomerListFilters): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {
    organizationId: filters.organizationId,
    deletedAt: null,
  };

  if (filters.status) {
    where.status = fromCustomerStatusDto(filters.status);
  }

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { legalName: { contains: term, mode: "insensitive" } },
      { customerNumber: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}
