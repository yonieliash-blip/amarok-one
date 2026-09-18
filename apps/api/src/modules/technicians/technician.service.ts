import { getDefaultModulesForRole } from "@amarok-one/permissions";
import { conflict, forbidden, notFound } from "../../lib/errors.js";
import { hashPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import type { CreateTechnicianInput } from "./technician.schemas.js";

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
  }));
}

/**
 * Create a new technician account for the active organization.
 * Existing global users are intentionally not attached implicitly: an owner must
 * resolve that account separately instead of silently granting tenant access.
 */
export async function createTechnician(
  organizationId: string,
  actorUserId: string,
  input: CreateTechnicianInput,
) {
  const actorMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId: actorUserId,
      deletedAt: null,
      status: "ACTIVE",
      user: { deletedAt: null },
      primaryRole: { deletedAt: null },
    },
    include: { primaryRole: true },
  });

  if (!actorMember || (!actorMember.isOrganizationOwner && !actorMember.primaryRole.isOwner)) {
    throw forbidden("Only the organization owner can create technicians");
  }

  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    throw conflict("A user with this email already exists", { field: "email" });
  }

  const technicianRole = await prisma.role.findFirst({
    where: {
      organizationId,
      slug: "technician",
      deletedAt: null,
    },
  });
  if (!technicianRole) {
    throw notFound("Technician role");
  }

  const passwordHash = await hashPassword(input.password);
  const enabledModules = getDefaultModulesForRole("technician");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        displayName,
        passwordHash,
        isActive: true,
      },
    });

    await tx.userRole.create({
      data: {
        organizationId,
        userId: user.id,
        roleId: technicianRole.id,
      },
    });

    const member = await tx.organizationMember.create({
      data: {
        organizationId,
        userId: user.id,
        primaryRoleId: technicianRole.id,
        isOrganizationOwner: false,
        status: "ACTIVE",
      },
    });

    for (const moduleKey of enabledModules) {
      await tx.memberModuleAccess.create({
        data: {
          organizationId,
          organizationMemberId: member.id,
          moduleKey,
          enabled: true,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId,
        actorId: actorUserId,
        action: "technician.created",
        entityType: "OrganizationMember",
        entityId: member.id,
        metadata: {
          targetUserId: user.id,
          email,
          role: "technician",
        },
      },
    });

    return {
      id: member.id,
      userId: user.id,
      displayName: user.displayName,
      email: user.email,
      status: member.status,
      isActive: user.isActive && member.status === "ACTIVE",
      role: {
        id: technicianRole.id,
        slug: technicianRole.slug,
        name: technicianRole.name,
      },
    };
  });
}
