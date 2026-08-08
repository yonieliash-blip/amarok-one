import {
  getDefaultModulesForRole,
  isModuleKey,
  resolveEffectivePermissions,
  type ModuleKey,
} from "@amarok-one/permissions";
import type { Prisma } from "@prisma/client";
import { activeOnly } from "./mappers.js";
import { prisma } from "./prisma.js";

export const memberInclude = {
  user: true,
  primaryRole: true,
  moduleAccess: true,
  organization: true,
} as const satisfies Prisma.OrganizationMemberInclude;

export type LoadedOrganizationMember = Prisma.OrganizationMemberGetPayload<{
  include: typeof memberInclude;
}>;

export interface ResolvedMemberAuthorization {
  member: LoadedOrganizationMember;
  permissions: string[];
  enabledModules: ModuleKey[];
  isOrganizationOwner: boolean;
  permissionsVersion: number;
}

export function getEnabledModuleKeys(
  member: Pick<LoadedOrganizationMember, "moduleAccess">,
): ModuleKey[] {
  return member.moduleAccess
    .filter((entry) => entry.enabled && isModuleKey(entry.moduleKey))
    .map((entry) => entry.moduleKey as ModuleKey);
}

export function resolveMemberAuthorization(
  member: LoadedOrganizationMember,
): ResolvedMemberAuthorization {
  const enabledModules = getEnabledModuleKeys(member);
  const effective = resolveEffectivePermissions({
    isOrganizationOwner: member.isOrganizationOwner,
    primaryRoleSlug: member.primaryRole.slug,
    primaryRoleIsOwner: member.primaryRole.isOwner,
    enabledModules,
  });

  return {
    member,
    permissions: effective.permissions,
    enabledModules: effective.enabledModules,
    isOrganizationOwner: effective.isOrganizationOwner,
    permissionsVersion: member.permissionsVersion,
  };
}

export async function loadOrganizationMember(
  organizationId: string,
  userId: string,
): Promise<LoadedOrganizationMember | null> {
  return prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId,
      ...activeOnly,
      status: "ACTIVE",
      user: activeOnly,
      primaryRole: activeOnly,
    },
    include: memberInclude,
  });
}

export async function loadOrganizationMemberById(
  organizationId: string,
  memberId: string,
): Promise<LoadedOrganizationMember | null> {
  return prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId,
      ...activeOnly,
      status: "ACTIVE",
      user: activeOnly,
      primaryRole: activeOnly,
    },
    include: memberInclude,
  });
}

export async function countOrganizationOwners(organizationId: string): Promise<number> {
  return prisma.organizationMember.count({
    where: {
      organizationId,
      ...activeOnly,
      status: "ACTIVE",
      isOrganizationOwner: true,
    },
  });
}

export async function replaceMemberModuleAccess(
  organizationId: string,
  organizationMemberId: string,
  moduleKeys: readonly ModuleKey[],
): Promise<void> {
  const enabledSet = new Set(moduleKeys);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.memberModuleAccess.findMany({
      where: { organizationMemberId, organizationId },
    });

    for (const moduleKey of enabledSet) {
      await tx.memberModuleAccess.upsert({
        where: {
          organizationMemberId_moduleKey: {
            organizationMemberId,
            moduleKey,
          },
        },
        create: {
          organizationId,
          organizationMemberId,
          moduleKey,
          enabled: true,
        },
        update: {
          enabled: true,
        },
      });
    }

    for (const row of existing) {
      if (!enabledSet.has(row.moduleKey as ModuleKey)) {
        await tx.memberModuleAccess.update({
          where: { id: row.id },
          data: { enabled: false },
        });
      }
    }
  });
}

export async function seedMemberModulesFromRole(
  organizationId: string,
  organizationMemberId: string,
  roleSlug: string,
): Promise<void> {
  const modules = getDefaultModulesForRole(roleSlug);
  await replaceMemberModuleAccess(organizationId, organizationMemberId, modules);
}

export async function bumpMemberPermissionsVersion(memberId: string): Promise<number> {
  const updated = await prisma.organizationMember.update({
    where: { id: memberId },
    data: { permissionsVersion: { increment: 1 } },
    select: { permissionsVersion: true },
  });
  return updated.permissionsVersion;
}

export async function ensureOrganizationMember(input: {
  organizationId: string;
  userId: string;
  primaryRoleId: string;
  roleSlug: string;
  isOrganizationOwner?: boolean;
}): Promise<LoadedOrganizationMember> {
  const isOrganizationOwner = input.isOrganizationOwner ?? false;

  const member = await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
    update: {
      primaryRoleId: input.primaryRoleId,
      isOrganizationOwner,
      status: "ACTIVE",
      deletedAt: null,
    },
    create: {
      organizationId: input.organizationId,
      userId: input.userId,
      primaryRoleId: input.primaryRoleId,
      isOrganizationOwner,
      status: "ACTIVE",
    },
    include: memberInclude,
  });

  await seedMemberModulesFromRole(input.organizationId, member.id, input.roleSlug);
  return loadOrganizationMemberById(input.organizationId, member.id).then((loaded) => {
    if (!loaded) {
      throw new Error("Failed to load organization member after upsert");
    }
    return loaded;
  });
}
