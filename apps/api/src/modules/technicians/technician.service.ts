import { writeAuditLog } from "../../lib/audit.js";
import { notFound } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

/** List technician members belonging to the active organization only. */
export async function listTechnicians(organizationId: string) {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      deletedAt: null,
      primaryRole: { slug: "technician", deletedAt: null },
      user: { deletedAt: null },
    },
    include: {
      user: true,
      primaryRole: true,
    },
    orderBy: [{ status: "asc" }, { user: { displayName: "asc" } }],
  });

  const vans = await prisma.inventoryLocation.findMany({
    where: {
      organizationId,
      deletedAt: null,
      type: "SERVICE_VAN",
    },
    select: {
      id: true,
      name: true,
      assignedUserId: true,
    },
  });

  const vanByUserId = new Map(
    vans.filter((van) => van.assignedUserId).map((van) => [van.assignedUserId!, van]),
  );

  return members.map((member) => ({
    id: member.id,
    userId: member.userId,
    displayName: member.user.displayName,
    email: member.user.email,
    status: member.status,
    isActive: member.user.isActive && member.status === "ACTIVE",
    role: {
      id: member.primaryRole.id,
      slug: member.primaryRole.slug,
      name: member.primaryRole.name,
    },
    assignedVan: vanByUserId.get(member.userId)
      ? {
          id: vanByUserId.get(member.userId)!.id,
          name: vanByUserId.get(member.userId)!.name,
        }
      : undefined,
  }));
}

export async function assignTechnicianServiceVan(
  organizationId: string,
  technicianMemberId: string,
  inventoryLocationId: string | null,
  actorId?: string,
) {
  const member = await prisma.organizationMember.findFirst({
    where: {
      id: technicianMemberId,
      organizationId,
      deletedAt: null,
      primaryRole: { slug: "technician", deletedAt: null },
    },
    include: {
      user: true,
    },
  });

  if (!member) {
    throw notFound("OrganizationMember", technicianMemberId);
  }

  const assignedVan = await prisma.$transaction(async (tx) => {
    await tx.inventoryLocation.updateMany({
      where: {
        organizationId,
        assignedUserId: member.userId,
        type: "SERVICE_VAN",
        deletedAt: null,
      },
      data: {
        assignedUserId: null,
      },
    });

    if (!inventoryLocationId) {
      return null;
    }

    const van = await tx.inventoryLocation.findFirst({
      where: {
        id: inventoryLocationId,
        organizationId,
        type: "SERVICE_VAN",
        deletedAt: null,
      },
    });

    if (!van) {
      throw notFound("InventoryLocation", inventoryLocationId);
    }

    return tx.inventoryLocation.update({
      where: { id: inventoryLocationId, organizationId },
      data: {
        assignedUserId: member.userId,
      },
      select: {
        id: true,
        name: true,
      },
    });
  });

  await writeAuditLog({
    organizationId,
    actorId,
    action: "technician.service_van.assigned",
    entityType: "OrganizationMember",
    entityId: member.id,
    metadata: {
      technicianUserId: member.userId,
      inventoryLocationId: assignedVan?.id ?? null,
    },
  });

  return assignedVan;
}
