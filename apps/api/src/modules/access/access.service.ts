import {
  MODULE_DEFINITIONS,
  ORGANIZATION_OWNER_ROLE_SLUG,
  getDefaultModulesForRole,
  isModuleKey,
  type ModuleKey,
} from "@amarok-one/permissions";
import { forbidden, notFound, badRequest, conflict } from "../../lib/errors.js";
import { activeOnly } from "../../lib/mappers.js";
import { prisma } from "../../lib/prisma.js";
import { hashPassword } from "../../lib/password.js";
import { Prisma } from "@prisma/client";
import { writeAuditLog } from "../../lib/audit.js";
import {
  bumpMemberPermissionsVersion,
  countOrganizationOwners,
  loadOrganizationMemberById,
  memberInclude,
  replaceMemberModuleAccess,
  resolveMemberAuthorization,
  getEnabledModuleKeys,
} from "../../lib/member-access.js";
import type {
  CreateOrganizationMemberInput,
  UpdateMemberModuleAccessInput,
} from "./access.schemas.js";

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
    const email = input.email.trim().toLowerCase();
    const role = await prisma.role.findFirst({
      where: {
        organizationId,
        slug: input.roleSlug,
        deletedAt: null,
      },
    });

    if (!role) {
      throw notFound("Role not found");
    }

    const passwordHash = await hashPassword(input.password);

    try {
      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            displayName: input.displayName.trim(),
            passwordHash,
            isActive: true,
          },
        });

        await tx.userRole.create({
          data: {
            organizationId,
            userId: user.id,
            roleId: role.id,
          },
        });

        const member = await tx.organizationMember.create({
          data: {
            organizationId,
            userId: user.id,
            primaryRoleId: role.id,
            isOrganizationOwner: false,
            status: "ACTIVE",
          },
        });

        const moduleKeys = [...getDefaultModulesForRole(role.slug)];
        if (moduleKeys.length > 0) {
          await tx.memberModuleAccess.createMany({
            data: moduleKeys.map((moduleKey) => ({
              organizationId,
              organizationMemberId: member.id,
              moduleKey,
              enabled: true,
            })),
          });
        }

        return {
          id: member.id,
          userId: user.id,
          displayName: user.displayName,
          email: user.email,
          primaryRole: {
            id: role.id,
            slug: role.slug,
            name: role.name,
          },
          isOrganizationOwner: false,
          enabledModules: moduleKeys,
          permissionsVersion: member.permissionsVersion,
        };
      });

      await writeAuditLog({
        organizationId,
        actorId: actorUserId,
        action: "member.created",
        entityType: "OrganizationMember",
        entityId: created.id,
        metadata: {
          targetUserId: created.userId,
          email: created.email,
          roleSlug: created.primaryRole.slug,
        },
      });

      return created;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw conflict("Email already exists", { email });
      }
      throw error;
    }
  }

  async function listMembers(organizationId: string) {
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId,
        ...activeOnly,
        status: "ACTIVE",
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
        enabledModules: resolved.enabledModules,
        permissionsVersion: member.permissionsVersion,
      };
    });
  }

  async function getMemberAccess(organizationId: string, memberId: string) {
    const member = await loadOrganizationMemberById(organizationId, memberId);
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
      enabledModules: resolved.enabledModules,
      availableModules: MODULE_DEFINITIONS.map((module) => ({
        key: module.key,
        name: module.name,
        description: module.description,
      })),
      permissionsVersion: member.permissionsVersion,
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
      loadOrganizationMemberById(organizationId, memberId),
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

    const refreshed = await loadOrganizationMemberById(organizationId, memberId);
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
    assertOwnerInvariantOnDemote,
  };
}

export type AccessService = ReturnType<typeof createAccessService>;
