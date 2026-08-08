/**
 * Verifies tenant context + modular permission middleware on protected routes.
 * Run: pnpm exec tsx --env-file=../../.env scripts/verify-tenant-context-regression.ts
 */
import { PrismaClient } from "@prisma/client";
import { signAccessToken } from "../src/lib/jwt.js";
import { resolveMemberAuthorization, loadOrganizationMember } from "../src/lib/member-access.js";
import { runWithoutTenantIsolation, runWithTenantContext } from "../src/lib/tenant-context.js";

const API_URL = process.env.VITE_API_URL?.trim() || "http://localhost:3000";

async function buildSessionToken(email: string): Promise<{
  accessToken: string;
  organizationId: string;
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
        throw new Error(`Organization member not found for ${email}`);
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

      return { accessToken, organizationId: member.organizationId };
    } finally {
      await prisma.$disconnect();
    }
  });
}

async function getAssignees(accessToken: string, organizationId: string): Promise<Response> {
  return fetch(`${API_URL}/organizations/${organizationId}/service-calls/assignees`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function listServiceCalls(accessToken: string, organizationId: string): Promise<Response> {
  return fetch(`${API_URL}/organizations/${organizationId}/service-calls?page=1&pageSize=5`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  console.log("Tenant context regression verification");
  console.log(`API: ${API_URL}`);

  try {
    const owner = await buildSessionToken("admin@demo.amarok.one");
    const ownerResponse = await listServiceCalls(owner.accessToken, owner.organizationId);
    console.log(`Owner service-calls: ${ownerResponse.status}`);
    if (!ownerResponse.ok) {
      console.error(await ownerResponse.text());
      process.exitCode = 1;
      return;
    }

    const manager = await buildSessionToken("manager@demo.amarok.one");
    const managerResponse = await listServiceCalls(manager.accessToken, manager.organizationId);
    console.log(`Service manager service-calls: ${managerResponse.status}`);
    if (managerResponse.status !== 200) {
      console.error(await managerResponse.text());
      process.exitCode = 1;
      return;
    }

    const technician = await buildSessionToken("tech1@demo.amarok.one");
    const technicianAssignees = await getAssignees(
      technician.accessToken,
      technician.organizationId,
    );
    console.log(`Technician assignees (expect 403): ${technicianAssignees.status}`);
    if (technicianAssignees.status !== 403) {
      console.error("Expected technician to be denied service-calls assignees");
      process.exitCode = 1;
      return;
    }

    const technicianList = await listServiceCalls(
      technician.accessToken,
      technician.organizationId,
    );
    console.log(`Technician scoped service-calls list: ${technicianList.status}`);
    if (technicianList.status !== 200) {
      console.error(await technicianList.text());
      process.exitCode = 1;
      return;
    }

    const fakeOrgId = "00000000-0000-4000-8000-000000000001";
    const crossTenant = await listServiceCalls(owner.accessToken, fakeOrgId);
    console.log(`Cross-tenant service-calls (expect 403): ${crossTenant.status}`);
    if (crossTenant.status !== 403) {
      console.error("Cross-tenant access was not blocked");
      process.exitCode = 1;
      return;
    }

    const accessMembers = await fetch(
      `${API_URL}/organizations/${owner.organizationId}/access/members`,
      { headers: { Authorization: `Bearer ${owner.accessToken}` } },
    );
    console.log(`Owner access/members: ${accessMembers.status}`);
    if (!accessMembers.ok) {
      console.error(await accessMembers.text());
      process.exitCode = 1;
      return;
    }

    await runWithTenantContext({ organizationId: owner.organizationId }, async () => {
      const member = await loadOrganizationMember(
        owner.organizationId,
        "00000000-0000-0000-0000-000000000000",
      );
      if (member !== null) {
        throw new Error("Expected null member for unknown user within tenant context");
      }
    });

    console.log("All tenant-context regression checks passed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
