/**
 * End-to-end verification for Owner module-access management.
 * Run: pnpm exec tsx --env-file=../../.env scripts/verify-member-module-access.ts
 */
import { PrismaClient } from "@prisma/client";
import { signAccessToken } from "../src/lib/jwt.js";
import { resolveMemberAuthorization } from "../src/lib/member-access.js";
import { runWithoutTenantIsolation } from "../src/lib/tenant-context.js";

const API_URL = process.env.VITE_API_URL?.trim() || "http://localhost:3000";

async function buildToken(email: string): Promise<{
  accessToken: string;
  organizationId: string;
  userId: string;
}> {
  return runWithoutTenantIsolation(async () => {
    const prisma = new PrismaClient();
    try {
      const user = await prisma.user.findFirst({
        where: { email, deletedAt: null, isActive: true },
      });
      if (!user) {
        throw new Error(`User not found: ${email}`);
      }

      const member = await prisma.organizationMember.findFirst({
        where: {
          userId: user.id,
          deletedAt: null,
          status: "ACTIVE",
          organization: { slug: "demo", deletedAt: null },
        },
        include: {
          organization: true,
          primaryRole: true,
          moduleAccess: true,
          user: true,
        },
      });
      if (!member) {
        throw new Error(`Member not found: ${email}`);
      }

      const resolved = resolveMemberAuthorization(member);
      const accessToken = await signAccessToken({
        sub: user.id,
        email: user.email,
        organizationId: member.organizationId,
        organizationSlug: member.organization.slug,
        roleId: member.primaryRoleId,
        roleSlug: member.primaryRole.slug,
        roles: [
          {
            id: member.primaryRole.id,
            slug: member.primaryRole.slug,
            name: member.primaryRole.name,
          },
        ],
        permissions: resolved.permissions,
        permissionsVersion: resolved.permissionsVersion,
        enabledModules: resolved.enabledModules,
        isOrganizationOwner: resolved.isOrganizationOwner,
      });

      return { accessToken, organizationId: member.organizationId, userId: user.id };
    } finally {
      await prisma.$disconnect();
    }
  });
}

async function getMemberId(email: string): Promise<string> {
  const prisma = new PrismaClient();
  try {
    const member = await prisma.organizationMember.findFirst({
      where: {
        user: { email },
        organization: { slug: "demo" },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!member) {
      throw new Error(`Member not found for ${email}`);
    }
    return member.id;
  } finally {
    await prisma.$disconnect();
  }
}

async function patchModules(
  accessToken: string,
  organizationId: string,
  memberId: string,
  enabledModules: string[],
): Promise<{ status: number; body: string }> {
  const response = await fetch(
    `${API_URL}/organizations/${organizationId}/access/members/${memberId}/modules`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabledModules }),
    },
  );
  return { status: response.status, body: await response.text() };
}

async function getMemberModules(
  accessToken: string,
  organizationId: string,
  memberId: string,
): Promise<string[]> {
  const response = await fetch(
    `${API_URL}/organizations/${organizationId}/access/members/${memberId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error(`GET member failed: ${response.status} ${await response.text()}`);
  }
  const payload = (await response.json()) as { data: { enabledModules: string[] } };
  return payload.data.enabledModules;
}

async function main(): Promise<void> {
  console.log("Member module access verification");
  console.log(`API: ${API_URL}`);

  const owner = await buildToken("admin@demo.amarok.one");
  const manager = await buildToken("manager@demo.amarok.one");
  const managerMemberId = await getMemberId("manager@demo.amarok.one");
  const ownerMemberId = await getMemberId("admin@demo.amarok.one");

  const withInventory = ["core", "service", "administration", "inventory"] as const;
  const withoutInventory = ["core", "service", "administration"] as const;

  const addResult = await patchModules(owner.accessToken, owner.organizationId, managerMemberId, [
    ...withInventory,
  ]);
  console.log(`Owner add inventory: ${addResult.status}`);
  if (addResult.status !== 200) {
    console.error(addResult.body);
    process.exitCode = 1;
    return;
  }

  const afterAdd = await getMemberModules(owner.accessToken, owner.organizationId, managerMemberId);
  console.log(`Manager modules after add: ${afterAdd.join(", ")}`);
  if (!afterAdd.includes("inventory")) {
    console.error("Inventory module not persisted after add");
    process.exitCode = 1;
    return;
  }

  const removeResult = await patchModules(
    owner.accessToken,
    owner.organizationId,
    managerMemberId,
    [...withoutInventory],
  );
  console.log(`Owner remove inventory: ${removeResult.status}`);
  if (removeResult.status !== 200) {
    console.error(removeResult.body);
    process.exitCode = 1;
    return;
  }

  const afterRemove = await getMemberModules(
    owner.accessToken,
    owner.organizationId,
    managerMemberId,
  );
  console.log(`Manager modules after remove: ${afterRemove.join(", ")}`);
  if (afterRemove.includes("inventory")) {
    console.error("Inventory module still enabled after remove");
    process.exitCode = 1;
    return;
  }

  const managerDenied = await patchModules(
    manager.accessToken,
    manager.organizationId,
    managerMemberId,
    [...withInventory],
  );
  console.log(`Non-owner patch (expect 403): ${managerDenied.status}`);
  if (managerDenied.status !== 403) {
    console.error(managerDenied.body);
    process.exitCode = 1;
    return;
  }

  const ownerSelfPatch = await patchModules(
    owner.accessToken,
    owner.organizationId,
    ownerMemberId,
    ["core"],
  );
  console.log(`Owner self-reduce attempt: ${ownerSelfPatch.status}`);
  const ownerModules = await getMemberModules(
    owner.accessToken,
    owner.organizationId,
    ownerMemberId,
  );
  console.log(`Owner modules remain full: ${ownerModules.join(", ")}`);
  if (ownerModules.length < 5) {
    console.error("Owner module access was reduced");
    process.exitCode = 1;
    return;
  }

  const managerInventoryApi = await fetch(
    `${API_URL}/organizations/${manager.organizationId}/equipment?page=1&pageSize=1`,
    { headers: { Authorization: `Bearer ${manager.accessToken}` } },
  );
  console.log(
    `Manager inventory API without module (equipment list): ${managerInventoryApi.status}`,
  );

  const prisma = new PrismaClient();
  try {
    const audit = await prisma.auditLog.findFirst({
      where: {
        organizationId: owner.organizationId,
        action: "member.module_access_changed",
        entityId: managerMemberId,
      },
      orderBy: { createdAt: "desc" },
    });
    console.log(`Audit log recorded: ${audit ? "yes" : "no"}`);
    if (!audit) {
      process.exitCode = 1;
      return;
    }
  } finally {
    await prisma.$disconnect();
  }

  // Restore manager defaults for local dev consistency
  await patchModules(owner.accessToken, owner.organizationId, managerMemberId, [
    ...withoutInventory,
  ]);

  console.log("All member module access checks passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
