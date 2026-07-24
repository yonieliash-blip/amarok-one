import type { EquipmentStatus } from "@amarok-one/types";
import type { Prisma } from "@prisma/client";
import { fromEquipmentStatusDto } from "../../lib/mappers.js";

export interface EquipmentListFilters {
  organizationId: string;
  search?: string;
  customerId?: string;
  manufacturer?: string;
  model?: string;
  equipmentTypeId?: string;
  status?: EquipmentStatus;
}

export function buildEquipmentListWhere(filters: EquipmentListFilters): Prisma.EquipmentWhereInput {
  const where: Prisma.EquipmentWhereInput = {
    organizationId: filters.organizationId,
    deletedAt: null,
  };

  if (filters.status) {
    where.status = fromEquipmentStatusDto(filters.status);
  }

  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters.manufacturer?.trim()) {
    where.manufacturer = { equals: filters.manufacturer.trim(), mode: "insensitive" };
  }

  if (filters.model?.trim()) {
    where.model = { equals: filters.model.trim(), mode: "insensitive" };
  }

  if (filters.equipmentTypeId) {
    where.equipmentTypeId = filters.equipmentTypeId;
  }

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { internalNumber: { contains: term, mode: "insensitive" } },
      { serialNumber: { contains: term, mode: "insensitive" } },
      { manufacturer: { contains: term, mode: "insensitive" } },
      { model: { contains: term, mode: "insensitive" } },
      { registrationNumber: { contains: term, mode: "insensitive" } },
      { location: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}
