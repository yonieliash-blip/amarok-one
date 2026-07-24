import type { ServiceCallPriority, ServiceCallStatus } from "@amarok-one/types";
import type { Prisma } from "@prisma/client";
import { fromServiceCallPriorityDto, fromServiceCallStatusDto } from "../../lib/mappers.js";

export interface ServiceCallListFilters {
  organizationId: string;
  search?: string;
  status?: ServiceCallStatus;
  priority?: ServiceCallPriority;
  customerId?: string;
  equipmentId?: string;
  assignedUserId?: string;
  openedFrom?: string;
  openedTo?: string;
}

export function buildServiceCallListWhere(
  filters: ServiceCallListFilters,
): Prisma.ServiceCallWhereInput {
  const where: Prisma.ServiceCallWhereInput = {
    organizationId: filters.organizationId,
    deletedAt: null,
  };

  if (filters.status) {
    where.status = fromServiceCallStatusDto(filters.status);
  }

  if (filters.priority) {
    where.priority = fromServiceCallPriorityDto(filters.priority);
  }

  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters.equipmentId) {
    where.equipmentId = filters.equipmentId;
  }

  if (filters.assignedUserId) {
    where.assignedUserId = filters.assignedUserId;
  }

  if (filters.openedFrom || filters.openedTo) {
    where.openedAt = {
      ...(filters.openedFrom ? { gte: new Date(filters.openedFrom) } : {}),
      ...(filters.openedTo ? { lte: new Date(filters.openedTo) } : {}),
    };
  }

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { serviceCallNumber: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { contactName: { contains: term, mode: "insensitive" } },
      { location: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}
