/**
 * Modular authorization acceptance verification for Demo Service Manager.
 * Run: pnpm exec tsx --env-file=../../.env scripts/verify-modular-auth-acceptance.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  APP_ROUTE_ACCESS,
  PERMISSIONS,
  buildNavigationItems,
  canAccessPath,
} from "@amarok-one/permissions";
import { signAccessToken } from "../src/lib/jwt.js";
import { resolveMemberAuthorization } from "../src/lib/member-access.js";
import { runWithoutTenantIsolation } from "../src/lib/tenant-context.js";

const API_URL = process.env.VITE_API_URL?.trim() || "http://localhost:3000";

const FINANCE_FRONTEND_ROUTES = ["/accounting", "/dashboard/accounting"] as const;

const INVENTORY_FRONTEND_ROUTES = ["/inventory", "/purchase-orders", "/parts"] as const;

const ALLOWED_MANAGER_ROUTES = [
  "/dashboard/service",
  "/service-calls",
  "/equipment",
  "/customers",
] as const;

const FINANCE_PERMISSIONS = [PERMISSIONS.ACCOUNTING_READ, PERMISSIONS.ACCOUNTING_WRITE] as const;

interface SessionContext {
  accessToken: string;
  organizationId: string;
  roleSlug: string;
  permissions: string[];
  enabledModules: string[];
  isOrganizationOwner: boolean;
}

async function loadSession(email: string): Promise<SessionContext> {
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

      return {
        accessToken,
        organizationId: member.organizationId,
        roleSlug: member.primaryRole.slug,
        permissions: resolved.permissions,
        enabledModules: resolved.enabledModules,
        isOrganizationOwner: resolved.isOrganizationOwner,
      };
    } finally {
      await prisma.$disconnect();
    }
  });
}

async function authMe(accessToken: string): Promise<string[]> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`auth/me failed: ${response.status} ${await response.text()}`);
  }
  const payload = (await response.json()) as {
    data: { permissions: Array<{ slug: string }> };
  };
  return payload.data.permissions.map((entry) => entry.slug);
}

async function apiGet(accessToken: string, path: string): Promise<number> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.status;
}

function financeRoutesFromRegistry(): string[] {
  return APP_ROUTE_ACCESS.filter((rule) =>
    rule.permissions.some(
      (permission) =>
        permission === PERMISSIONS.ACCOUNTING_READ || permission === PERMISSIONS.ACCOUNTING_WRITE,
    ),
  ).map((rule) => rule.path);
}

async function main(): Promise<void> {
  console.log("Modular authorization acceptance verification");
  console.log(`API: ${API_URL}`);

  const manager = await loadSession("manager@demo.amarok.one");
  const owner = await loadSession("admin@demo.amarok.one");

  console.log(`Manager modules: ${manager.enabledModules.join(", ")}`);
  console.log(`Owner modules: ${owner.enabledModules.join(", ")}`);

  const expectedManagerModules = new Set(["core", "service", "administration"]);
  for (const moduleKey of manager.enabledModules) {
    if (!expectedManagerModules.has(moduleKey)) {
      console.error(`Unexpected manager module enabled: ${moduleKey}`);
      process.exitCode = 1;
      return;
    }
  }
  if (manager.enabledModules.includes("inventory")) {
    console.error("Inventory module must not be enabled for manager");
    process.exitCode = 1;
    return;
  }
  if (manager.enabledModules.includes("finance")) {
    console.error("Finance module must not be enabled for manager");
    process.exitCode = 1;
    return;
  }

  for (const permission of FINANCE_PERMISSIONS) {
    if (manager.permissions.includes(permission)) {
      console.error(`Manager must not have permission: ${permission}`);
      process.exitCode = 1;
      return;
    }
  }
  console.log("Manager lacks finance permissions: OK");

  for (const route of INVENTORY_FRONTEND_ROUTES) {
    const allowed = canAccessPath(route, manager.permissions, {
      activeRoleSlug: manager.roleSlug,
    });
    console.log(`Manager frontend ${route}: ${allowed ? "ALLOWED" : "DENIED"}`);
    if (allowed) {
      console.error(`Inventory route must be denied: ${route}`);
      process.exitCode = 1;
      return;
    }
  }

  const registryFinanceRoutes = financeRoutesFromRegistry();
  const financeRoutes = [...new Set([...FINANCE_FRONTEND_ROUTES, ...registryFinanceRoutes])];

  for (const route of financeRoutes) {
    const allowed = canAccessPath(route, manager.permissions, {
      activeRoleSlug: manager.roleSlug,
    });
    console.log(`Manager frontend ${route}: ${allowed ? "ALLOWED" : "DENIED"}`);
    if (allowed) {
      console.error(`Finance route must be denied: ${route}`);
      process.exitCode = 1;
      return;
    }
  }

  for (const route of ALLOWED_MANAGER_ROUTES) {
    const allowed = canAccessPath(route, manager.permissions, {
      activeRoleSlug: manager.roleSlug,
    });
    console.log(`Manager frontend ${route}: ${allowed ? "ALLOWED" : "DENIED"}`);
    if (!allowed) {
      console.error(`Expected route to be allowed: ${route}`);
      process.exitCode = 1;
      return;
    }
  }

  const navItems = buildNavigationItems(manager.permissions, manager.roleSlug, {
    isOrganizationOwner: manager.isOrganizationOwner,
  });
  const navIds = navItems.map((item) => item.id);
  if (navIds.includes("accounting")) {
    console.error("Accounting nav item must be hidden for manager");
    process.exitCode = 1;
    return;
  }
  if (navIds.includes("inventory") || navIds.includes("accounting")) {
    console.error("Inventory and accounting nav items must be hidden for manager");
    process.exitCode = 1;
    return;
  }
  if (navIds.includes("member-access")) {
    console.error("Owner-only member access navigation must be hidden for manager");
    process.exitCode = 1;
    return;
  }
  if (!navIds.includes("service-calls")) {
    console.error("Service navigation must remain visible for manager");
    process.exitCode = 1;
    return;
  }
  console.log("Manager navigation: service visible; inventory, finance, and member access hidden");

  const mePermissions = await authMe(manager.accessToken);
  for (const permission of FINANCE_PERMISSIONS) {
    if (mePermissions.includes(permission)) {
      console.error(`auth/me must not expose finance permission: ${permission}`);
      process.exitCode = 1;
      return;
    }
  }
  console.log("Manager auth/me finance permissions: absent");

  const serviceCallsStatus = await apiGet(
    manager.accessToken,
    `/organizations/${manager.organizationId}/service-calls?page=1&pageSize=5`,
  );
  console.log(`Manager API service-calls: ${serviceCallsStatus}`);
  if (serviceCallsStatus !== 200) {
    process.exitCode = 1;
    return;
  }

  const customersStatus = await apiGet(
    manager.accessToken,
    `/organizations/${manager.organizationId}/customers?page=1&pageSize=5`,
  );
  console.log(`Manager API customers (core): ${customersStatus}`);
  if (customersStatus !== 200) {
    process.exitCode = 1;
    return;
  }

  const accessMembersStatus = await apiGet(
    manager.accessToken,
    `/organizations/${manager.organizationId}/access/members`,
  );
  console.log(`Manager API access/members (administration read): ${accessMembersStatus}`);
  if (accessMembersStatus !== 200) {
    process.exitCode = 1;
    return;
  }

  const managerPatch = await fetch(
    `${API_URL}/organizations/${manager.organizationId}/access/members/${manager.organizationId}/modules`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${manager.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabledModules: ["core", "finance"] }),
    },
  );
  console.log(`Manager API finance-style admin write (expect 403/404): ${managerPatch.status}`);
  if (managerPatch.status === 200) {
    console.error("Manager must not succeed at module administration write");
    process.exitCode = 1;
    return;
  }

  console.log(
    "Note: No dedicated finance REST module exists yet; finance API denial verified via auth/me permissions and admin write protection.",
  );

  for (const permission of FINANCE_PERMISSIONS) {
    if (!owner.permissions.includes(permission)) {
      console.error(`Owner must have permission: ${permission}`);
      process.exitCode = 1;
      return;
    }
  }
  const ownerAccountingRoute = canAccessPath("/accounting", owner.permissions, {
    activeRoleSlug: owner.roleSlug,
  });
  console.log(`Owner frontend /accounting: ${ownerAccountingRoute ? "ALLOWED" : "DENIED"}`);
  if (!ownerAccountingRoute) {
    process.exitCode = 1;
    return;
  }

  const ownerExecutive = canAccessPath("/dashboard/executive", owner.permissions, {
    activeRoleSlug: owner.roleSlug,
  });
  console.log(`Owner frontend /dashboard/executive: ${ownerExecutive ? "ALLOWED" : "DENIED"}`);
  if (!ownerExecutive) {
    process.exitCode = 1;
    return;
  }

  const crossTenant = await apiGet(
    owner.accessToken,
    `/organizations/00000000-0000-4000-8000-000000000001/service-calls?page=1&pageSize=1`,
  );
  console.log(`Cross-tenant service-calls (expect 403): ${crossTenant}`);
  if (crossTenant !== 403) {
    process.exitCode = 1;
    return;
  }

  console.log("Modular authorization acceptance test PASSED end-to-end.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
