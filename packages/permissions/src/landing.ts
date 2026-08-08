import { PERMISSIONS, type PermissionSlug } from "./permissions.js";
import { canAccessPath } from "./routes.js";

export type DashboardNavLabelKey =
  | "managementDashboard"
  | "executiveDashboard"
  | "serviceDashboard"
  | "warehouseDashboard"
  | "accountingDashboard"
  | "readOnlyDashboard";

/** Default landing path for each role slug. */
export const ROLE_LANDING_PATHS: Readonly<Record<string, string>> = {
  "system-administrator": "/dashboard/management",
  "organization-owner": "/dashboard/executive",
  "service-manager": "/dashboard/service",
  "service-coordinator": "/dashboard/service",
  technician: "/my/service-calls",
  "parts-manager": "/dashboard/warehouse",
  "warehouse-employee": "/dashboard/warehouse",
  accounting: "/dashboard/accounting",
  "read-only": "/dashboard/read-only",
};

export type DashboardKind =
  "management" | "executive" | "service" | "warehouse" | "accounting" | "read-only";

export interface RoleDashboardDefinition {
  kind: DashboardKind;
  path: string;
  labelKey: DashboardNavLabelKey;
  /** Role slugs allowed to view this dashboard. */
  roleSlugs: readonly string[];
  /** Permissions required in addition to role match. */
  permissions: readonly PermissionSlug[];
}

export const ROLE_DASHBOARDS: readonly RoleDashboardDefinition[] = [
  {
    kind: "management",
    path: "/dashboard/management",
    labelKey: "managementDashboard",
    roleSlugs: ["system-administrator"],
    permissions: [PERMISSIONS.DASHBOARD_READ],
  },
  {
    kind: "executive",
    path: "/dashboard/executive",
    labelKey: "executiveDashboard",
    roleSlugs: ["organization-owner"],
    permissions: [PERMISSIONS.DASHBOARD_READ],
  },
  {
    kind: "service",
    path: "/dashboard/service",
    labelKey: "serviceDashboard",
    roleSlugs: ["service-manager", "service-coordinator"],
    permissions: [PERMISSIONS.DASHBOARD_READ],
  },
  {
    kind: "warehouse",
    path: "/dashboard/warehouse",
    labelKey: "warehouseDashboard",
    roleSlugs: ["warehouse-employee", "parts-manager"],
    permissions: [PERMISSIONS.INVENTORY_READ],
  },
  {
    kind: "accounting",
    path: "/dashboard/accounting",
    labelKey: "accountingDashboard",
    roleSlugs: ["accounting"],
    permissions: [PERMISSIONS.DASHBOARD_READ, PERMISSIONS.ACCOUNTING_READ],
  },
  {
    kind: "read-only",
    path: "/dashboard/read-only",
    labelKey: "readOnlyDashboard",
    roleSlugs: ["read-only"],
    permissions: [PERMISSIONS.DASHBOARD_READ],
  },
] as const;

export function getRoleLandingPath(activeRoleSlug: string | undefined): string | undefined {
  if (!activeRoleSlug) {
    return undefined;
  }

  return ROLE_LANDING_PATHS[activeRoleSlug];
}

export function getDashboardForRole(
  activeRoleSlug: string | undefined,
): RoleDashboardDefinition | undefined {
  if (!activeRoleSlug) {
    return undefined;
  }

  return ROLE_DASHBOARDS.find((dashboard) => dashboard.roleSlugs.includes(activeRoleSlug));
}

export function canAccessRoleLanding(
  granted: Iterable<string>,
  activeRoleSlug: string | undefined,
): boolean {
  const landingPath = getRoleLandingPath(activeRoleSlug);
  if (!landingPath) {
    return false;
  }

  return canAccessPath(landingPath, granted, { activeRoleSlug });
}
