import {
  MODULE_DEFINITIONS,
  ORGANIZATION_OWNER_ROLE_SLUG,
  isModuleKey,
  type ModuleKey,
} from "@amarok-one/permissions";
import { forbidden, notFound, badRequest } from "../../lib/errors.js";
import { activeOnly } from "../../lib/mappers.js";
import { prisma } from "../../lib/prisma.js";
import { writeAuditLog } from "../../lib/audit.js";
import { hashPassword } from "../../lib/password.js";
import {
  bumpMemberPermissionsVersion,
  countOrganizationOwners,
  loadOrganizationMember,
  loadOrganizationMemberById,
  memberInclude,
  replaceMemberModuleAccess,
  resolveMemberAuthorization,
  getEnabledModuleKeys,
} from "../../lib/member-access.js";
import type {
  CreateOrganizationMemberInput,
  UpdateMemberModuleAccessInput,
  UpdateMemberBirthDateInput,
  UpdateMemberStatusInput,
} from "./access.schemas.js";

async function loadMemberForManagement(organizationId: string, memberId: string) {
  return prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId,
      ...activeOnly,
      user: activeOnly,
      primaryRole: activeOnly,
    },
    include: memberInclude,
  });
}

function assertActorCanManageTarget(
  actorMember: Awaited<ReturnType<typeof loadOrganizationMemberById>>,
  targetMember: NonNullable<Awaited<ReturnType<typeof loadOrganizationMemberById>>>,
): void {
  if (!actorMember) {
    throw forbidden("Organization membership required");
  }

  if (!actorMember.isOrganizationOwner && !actorMember.primaryRole.isOwner) {
    throw forbidden("Only the organization owner can manage member module access");
  }

  if (
    targetMember.isOrganizationOwner ||
    targetMember.primaryRole.isOwner ||
    targetMember.primaryRole.slug === ORGANIZATION_OWNER_ROLE_SLUG
  ) {
    if (actorMember.userId !== targetMember.userId) {
      throw forbidden("The organization owner account cannot be modified by other users");
    }
  }
}

export function createAccessService() {
  async function createMember(
    organizationId: string,
    actorUserId: string,
    input: CreateOrganizationMemberInput,
  ) {
    const actor = await loadOrganizationMember(organizationId, actorUserId);
    if (!actor || (!actor.isOrganizationOwner && !actor.primaryRole.isOwner)) {
      throw forbidden("Only the organization owner can create organization members");
    }

    const email = input.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw badRequest("A user with this email already exists", { field: "email" });
    }

    const role = await prisma.role.findFirst({
      where: { organizationId, slug: input.primaryRoleSlug, ...activeOnly },
    });
    if (!role)
      throw badRequest("Selected staff role is not available", { field: "primaryRoleSlug" });

    const passwordHash = await hashPassword(input.initialPassword);
    const member = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { displayName: input.displayName, email, passwordHash },
      });
      const created = await tx.organizationMember.create({
        data: {
          organizationId,
          userId: user.id,
          primaryRoleId: role.id,
          birthDate: input.birthDate ? new Date(`${input.birthDate}T00:00:00.000Z`) : null,
          moduleAccess: {
            create: input.enabledModules.map((moduleKey) => ({ organizationId, moduleKey })),
          },
        },
        include: memberInclude,
      });
      await tx.userRole.create({ data: { organizationId, userId: user.id, roleId: role.id } });
      return created;
    });

    await writeAuditLog({
      organizationId,
      actorId: actorUserId,
      action: "member.created",
      entityType: "OrganizationMember",
      entityId: member.id,
      metadata: {
        targetUserId: member.userId,
        roleSlug: role.slug,
        enabledModules: input.enabledModules,
      },
    });

    const resolved = resolveMemberAuthorization(member);
    return {
      id: member.id,
      userId: member.userId,
      displayName: member.user.displayName,
      email: member.user.email,
      primaryRole: {
        id: member.primaryRole.id,
        slug: member.primaryRole.slug,
        name: member.primaryRole.name,
      },
      isOrganizationOwner: member.isOrganizationOwner,
      status: member.status,
      enabledModules: resolved.enabledModules,
      permissionsVersion: member.permissionsVersion,
      birthDate: member.birthDate?.toISOString().slice(0, 10),
    };
  }

  async function listMembers(organizationId: string) {
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId,
        ...activeOnly,
        user: activeOnly,
        primaryRole: activeOnly,
      },
      include: memberInclude,
      orderBy: [{ isOrganizationOwner: "desc" }, { user: { displayName: "asc" } }],
    });

    return members.map((member) => {
      const resolved = resolveMemberAuthorization(member);
      return {
        id: member.id,
        userId: member.userId,
        displayName: member.user.displayName,
        email: member.user.email,
        primaryRole: {
          id: member.primaryRole.id,
          slug: member.primaryRole.slug,
          name: member.primaryRole.name,
        },
        isOrganizationOwner: member.isOrganizationOwner,
        status: member.status,
        enabledModules: resolved.enabledModules,
        permissionsVersion: member.permissionsVersion,
        birthDate: member.birthDate?.toISOString().slice(0, 10),
      };
    });
  }

  async function getMemberAccess(organizationId: string, memberId: string) {
    const member = await loadMemberForManagement(organizationId, memberId);
    if (!member) {
      throw notFound("Organization member not found");
    }

    const resolved = resolveMemberAuthorization(member);
    return {
      id: member.id,
      userId: member.userId,
      displayName: member.user.displayName,
      email: member.user.email,
      primaryRole: {
        id: member.primaryRole.id,
        slug: member.primaryRole.slug,
        name: member.primaryRole.name,
      },
      isOrganizationOwner: member.isOrganizationOwner,
      status: member.status,
      enabledModules: resolved.enabledModules,
      availableModules: MODULE_DEFINITIONS.map((module) => ({
        key: module.key,
        name: module.name,
        description: module.description,
      })),
      permissionsVersion: member.permissionsVersion,
      birthDate: member.birthDate?.toISOString().slice(0, 10),
    };
  }

  async function updateMemberModuleAccess(
    organizationId: string,
    memberId: string,
    actorUserId: string,
    input: UpdateMemberModuleAccessInput,
  ) {
    const [actorMember, targetMember] = await Promise.all([
      prisma.organizationMember.findFirst({
        where: {
          organizationId,
          userId: actorUserId,
          ...activeOnly,
          status: "ACTIVE",
        },
        include: memberInclude,
      }),
      loadMemberForManagement(organizationId, memberId),
    ]);

    if (!targetMember) {
      throw notFound("Organization member not found");
    }

    assertActorCanManageTarget(actorMember, targetMember);

    const moduleKeys = input.enabledModules.filter((key): key is ModuleKey => isModuleKey(key));
    if (moduleKeys.length === 0 && !targetMember.isOrganizationOwner) {
      throw badRequest("At least one module must remain enabled", { field: "enabledModules" });
    }

    const beforeModules = getEnabledModuleKeys(targetMember);

    if (
      !targetMember.isOrganizationOwner &&
      !targetMember.primaryRole.isOwner &&
      targetMember.primaryRole.slug !== ORGANIZATION_OWNER_ROLE_SLUG
    ) {
      await replaceMemberModuleAccess(organizationId, targetMember.id, moduleKeys);
    }

    const permissionsVersion = await bumpMemberPermissionsVersion(targetMember.id);

    await writeAuditLog({
      organizationId,
      actorId: actorUserId,
      action: "member.module_access_changed",
      entityType: "OrganizationMember",
      entityId: targetMember.id,
      metadata: {
        targetUserId: targetMember.userId,
        before: { enabledModules: beforeModules },
        after: { enabledModules: moduleKeys, permissionsVersion },
      },
    });

    const refreshed = await loadMemberForManagement(organizationId, memberId);
    if (!refreshed) {
      throw notFound("Organization member not found");
    }

    const resolved = resolveMemberAuthorization(refreshed);
    return {
      id: refreshed.id,
      enabledModules: resolved.enabledModules,
      permissionsVersion,
    };
  }

  async function updateMemberStatus(
    organizationId: string,
    memberId: string,
    actorUserId: string,
    input: UpdateMemberStatusInput,
  ) {
    const [actorMember, targetMember] = await Promise.all([
      loadOrganizationMember(organizationId, actorUserId),
      loadMemberForManagement(organizationId, memberId),
    ]);

    if (!targetMember) {
      throw notFound("Organization member not found");
    }

    assertActorCanManageTarget(actorMember, targetMember);
    if (targetMember.isOrganizationOwner || targetMember.primaryRole.isOwner) {
      throw forbidden("The organization owner account cannot be suspended");
    }

    if (targetMember.status === input.status) {
      return {
        id: targetMember.id,
        status: targetMember.status,
        permissionsVersion: targetMember.permissionsVersion,
      };
    }

    const updated = await prisma.organizationMember.update({
      where: { id: targetMember.id },
      data: {
        status: input.status,
        permissionsVersion: { increment: 1 },
      },
      select: { status: true, permissionsVersion: true },
    });

    await writeAuditLog({
      organizationId,
      actorId: actorUserId,
      action: input.status === "SUSPENDED" ? "member.suspended" : "member.reactivated",
      entityType: "OrganizationMember",
      entityId: targetMember.id,
      metadata: {
        targetUserId: targetMember.userId,
        before: { status: targetMember.status },
        after: { status: updated.status, permissionsVersion: updated.permissionsVersion },
      },
    });

    return {
      id: targetMember.id,
      status: updated.status,
      permissionsVersion: updated.permissionsVersion,
    };
  }

  async function updateMemberBirthDate(
    organizationId: string,
    memberId: string,
    actorUserId: string,
    input: UpdateMemberBirthDateInput,
  ) {
    const [actorMember, targetMember] = await Promise.all([
      loadOrganizationMember(organizationId, actorUserId),
      loadMemberForManagement(organizationId, memberId),
    ]);
    if (!targetMember) throw notFound("Organization member not found");
    assertActorCanManageTarget(actorMember, targetMember);

    const birthDate = input.birthDate ? new Date(`${input.birthDate}T00:00:00.000Z`) : null;
    const updated = await prisma.organizationMember.update({
      where: { id: targetMember.id },
      data: { birthDate },
      select: { id: true, birthDate: true },
    });
    await writeAuditLog({
      organizationId,
      actorId: actorUserId,
      action: "member.birth_date_updated",
      entityType: "OrganizationMember",
      entityId: targetMember.id,
      metadata: { targetUserId: targetMember.userId, hasBirthDate: Boolean(updated.birthDate) },
    });
    return { id: updated.id, birthDate: updated.birthDate?.toISOString().slice(0, 10) };
  }

  async function assertOwnerInvariantOnDemote(
    organizationId: string,
    targetMemberId: string,
  ): Promise<void> {
    const owners = await countOrganizationOwners(organizationId);
    const target = await loadOrganizationMemberById(organizationId, targetMemberId);
    if (target?.isOrganizationOwner && owners <= 1) {
      throw forbidden("Cannot remove the last organization owner");
    }
  }

  return {
    createMember,
    listMembers,
    getMemberAccess,
    updateMemberModuleAccess,
    updateMemberStatus,
    updateMemberBirthDate,
    assertOwnerInvariantOnDemote,
  };
}

export type AccessService = ReturnType<typeof createAccessService>;
