/**
 * Migrates legacy UserRole rows to OrganizationMember + MemberModuleAccess.
 * Safe to run repeatedly (idempotent upserts).
 */
import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_ROLES,
  ORGANIZATION_OWNER_ROLE_SLUG,
  getDefaultModulesForRole,
} from "@amarok-one/permissions";

const prisma = new PrismaClient();

const LEGACY_OWNER_SLUG = "company-owner";

async function ensureOwnerRoleFlags(organizationId: string): Promise<void> {
  for (const roleDef of DEFAULT_ROLES) {
    if (!roleDef.isSystem && !roleDef.isOwner) {
      continue;
    }

    await prisma.role.updateMany({
      where: {
        organizationId,
        slug: roleDef.slug,
        deletedAt: null,
      },
      data: {
        isSystem: roleDef.isSystem ?? false,
        isOwner: roleDef.isOwner ?? false,
      },
    });
  }
}

async function renameLegacyOwnerRole(organizationId: string): Promise<void> {
  const legacy = await prisma.role.findFirst({
    where: {
      organizationId,
      slug: LEGACY_OWNER_SLUG,
      deletedAt: null,
    },
  });

  if (!legacy) {
    return;
  }

  const existingOwner = await prisma.role.findFirst({
    where: {
      organizationId,
      slug: ORGANIZATION_OWNER_ROLE_SLUG,
      deletedAt: null,
    },
  });

  if (existingOwner) {
    await prisma.userRole.updateMany({
      where: { roleId: legacy.id },
      data: { roleId: existingOwner.id },
    });
    await prisma.role.update({
      where: { id: legacy.id },
      data: { deletedAt: new Date() },
    });
    return;
  }

  await prisma.role.update({
    where: { id: legacy.id },
    data: {
      slug: ORGANIZATION_OWNER_ROLE_SLUG,
      name: "Organization Owner",
      isSystem: true,
      isOwner: true,
    },
  });
}

async function seedModulesForMember(
  organizationId: string,
  organizationMemberId: string,
  roleSlug: string,
): Promise<void> {
  const modules = getDefaultModulesForRole(roleSlug);
  for (const moduleKey of modules) {
    await prisma.memberModuleAccess.upsert({
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
}

async function migrateOrganization(organizationId: string): Promise<number> {
  await renameLegacyOwnerRole(organizationId);
  await ensureOwnerRoleFlags(organizationId);

  const userRoles = await prisma.userRole.findMany({
    where: {
      organizationId,
      deletedAt: null,
      user: { deletedAt: null, isActive: true },
      role: { deletedAt: null },
    },
    include: {
      role: true,
      user: true,
    },
    orderBy: [{ userId: "asc" }, { createdAt: "asc" }],
  });

  const byUser = new Map<string, typeof userRoles>();
  for (const userRole of userRoles) {
    const group = byUser.get(userRole.userId) ?? [];
    group.push(userRole);
    byUser.set(userRole.userId, group);
  }

  let migrated = 0;

  for (const [userId, assignments] of byUser) {
    const ownerAssignment = assignments.find(
      (entry) =>
        entry.role.isOwner ||
        entry.role.slug === ORGANIZATION_OWNER_ROLE_SLUG ||
        entry.role.slug === LEGACY_OWNER_SLUG,
    );
    const primary = ownerAssignment ?? assignments[0];
    if (!primary) {
      continue;
    }

    const isOrganizationOwner = Boolean(
      ownerAssignment &&
      (ownerAssignment.role.isOwner ||
        ownerAssignment.role.slug === ORGANIZATION_OWNER_ROLE_SLUG ||
        ownerAssignment.role.slug === LEGACY_OWNER_SLUG),
    );

    const member = await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      update: {
        primaryRoleId: primary.roleId,
        isOrganizationOwner,
        status: "ACTIVE",
        deletedAt: null,
      },
      create: {
        organizationId,
        userId,
        primaryRoleId: primary.roleId,
        isOrganizationOwner,
        status: "ACTIVE",
      },
    });

    await seedModulesForMember(organizationId, member.id, primary.role.slug);
    migrated += 1;
  }

  return migrated;
}

async function main(): Promise<void> {
  console.log("Migrating UserRole assignments to OrganizationMember...");

  const organizations = await prisma.organization.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true },
  });

  let total = 0;
  for (const organization of organizations) {
    const count = await migrateOrganization(organization.id);
    total += count;
    console.log(`  ${organization.slug}: ${count} member(s)`);
  }

  console.log(`Migration complete. ${total} organization member row(s) ensured.`);
}

main()
  .catch((error: unknown) => {
    console.error("Organization member migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
