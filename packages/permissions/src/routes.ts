import { isAssignedServiceCallsOnly } from "./engine.js";
import { ROLE_DASHBOARDS } from "./landing.js";
import { PERMISSIONS, type PermissionSlug } from "./permissions.js";

export interface RouteAccessOptions {
  requireWrite?: boolean;
  activeRoleSlug?: string;
}

export interface RouteAccessRule {
  /** Route pattern used for react-router matching (supports :params). */
  path: string;
  /** Permissions required to access the route. Default: any one permission. */
  permissions: readonly PermissionSlug[];
  /** When true, user must hold every permission listed. */
  requireAllPermissions?: boolean;
  /** Optional write permission for create/edit routes. */
  writePermissions?: readonly PermissionSlug[];
}

export const APP_ROUTE_ACCESS: readonly RouteAccessRule[] = [
  { path: "/dashboard/management", permissions: [PERMISSIONS.DASHBOARD_READ] },
  { path: "/dashboard/executive", permissions: [PERMISSIONS.DASHBOARD_READ] },
  { path: "/dashboard/service", permissions: [PERMISSIONS.DASHBOARD_READ] },
  { path: "/dashboard/warehouse", permissions: [PERMISSIONS.INVENTORY_READ] },
  {
    path: "/dashboard/accounting",
    permissions: [PERMISSIONS.DASHBOARD_READ, PERMISSIONS.ACCOUNTING_READ],
    requireAllPermissions: true,
  },
  { path: "/dashboard/read-only", permissions: [PERMISSIONS.DASHBOARD_READ] },
  { path: "/customers", permissions: [PERMISSIONS.CUSTOMERS_READ] },
  {
    path: "/customers/new",
    permissions: [PERMISSIONS.CUSTOMERS_READ],
    writePermissions: [PERMISSIONS.CUSTOMERS_WRITE],
  },
  { path: "/customers/:customerId", permissions: [PERMISSIONS.CUSTOMERS_READ] },
  {
    path: "/customers/:customerId/edit",
    permissions: [PERMISSIONS.CUSTOMERS_READ],
    writePermissions: [PERMISSIONS.CUSTOMERS_WRITE],
  },
  { path: "/equipment", permissions: [PERMISSIONS.EQUIPMENT_READ] },
  {
    path: "/equipment/new",
    permissions: [PERMISSIONS.EQUIPMENT_READ],
    writePermissions: [PERMISSIONS.EQUIPMENT_WRITE],
  },
  { path: "/equipment/:equipmentId", permissions: [PERMISSIONS.EQUIPMENT_READ] },
  {
    path: "/equipment/:equipmentId/edit",
    permissions: [PERMISSIONS.EQUIPMENT_READ],
    writePermissions: [PERMISSIONS.EQUIPMENT_WRITE],
  },
  { path: "/service-calls", permissions: [PERMISSIONS.SERVICE_CALLS_READ] },
  {
    path: "/service-calls/new",
    permissions: [PERMISSIONS.SERVICE_CALLS_READ],
    writePermissions: [PERMISSIONS.SERVICE_CALLS_WRITE],
  },
  {
    path: "/service-calls/:serviceCallId",
    permissions: [PERMISSIONS.SERVICE_CALLS_READ, PERMISSIONS.MY_SERVICE_CALLS_READ],
  },
  {
    path: "/service-calls/:serviceCallId/edit",
    permissions: [PERMISSIONS.SERVICE_CALLS_READ, PERMISSIONS.MY_SERVICE_CALLS_READ],
    writePermissions: [PERMISSIONS.SERVICE_CALLS_WRITE],
  },
  { path: "/my/service-calls", permissions: [PERMISSIONS.MY_SERVICE_CALLS_READ] },
  { path: "/my/equipment", permissions: [PERMISSIONS.MY_EQUIPMENT_READ] },
  { path: "/my/schedule", permissions: [PERMISSIONS.MY_SCHEDULE_READ] },
  { path: "/technicians", permissions: [PERMISSIONS.TECHNICIANS_READ] },
  { path: "/calendar", permissions: [PERMISSIONS.CALENDAR_READ] },
  { path: "/inventory", permissions: [PERMISSIONS.INVENTORY_READ] },
  { path: "/purchase-orders", permissions: [PERMISSIONS.PURCHASE_ORDERS_READ] },
  { path: "/parts", permissions: [PERMISSIONS.PARTS_READ] },
  { path: "/accounting", permissions: [PERMISSIONS.ACCOUNTING_READ] },
  { path: "/reports", permissions: [PERMISSIONS.REPORTS_READ] },
];

function patternToRegex(path: string): RegExp {
  const normalized = path.replace(/\/+$/, "") || "/";
  const pattern = normalized
    .split("/")
    .map((segment) =>
      segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("/");
  return new RegExp(`^${pattern}$`);
}

export function matchRouteAccess(pathname: string): RouteAccessRule | undefined {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  let bestMatch: RouteAccessRule | undefined;
  let bestScore = -1;

  for (const rule of APP_ROUTE_ACCESS) {
    const regex = patternToRegex(rule.path);
    if (!regex.test(normalized)) {
      continue;
    }

    const score = rule.path.split("/").filter(Boolean).length;
    if (score > bestScore) {
      bestMatch = rule;
      bestScore = score;
    }
  }

  return bestMatch;
}

export function canAccessPath(
  pathname: string,
  granted: Iterable<string>,
  options?: RouteAccessOptions,
): boolean {
  const rule = matchRouteAccess(pathname);
  if (!rule) {
    return pathname === "/" ? false : true;
  }

  const grantedSet = new Set(Array.from(granted, String));
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const readAllowed = rule.requireAllPermissions
    ? rule.permissions.every((permission) => grantedSet.has(permission))
    : rule.permissions.some((permission) => grantedSet.has(permission));
  if (!readAllowed) {
    return false;
  }

  const roleDashboard = ROLE_DASHBOARDS.find((dashboard) => dashboard.path === normalized);
  if (roleDashboard) {
    if (!options?.activeRoleSlug || !roleDashboard.roleSlugs.includes(options.activeRoleSlug)) {
      return false;
    }
  }

  if (options?.requireWrite && rule.writePermissions) {
    const writeAllowed = rule.writePermissions.some((permission) => grantedSet.has(permission));
    if (!writeAllowed) {
      return false;
    }
  }

  if (
    options?.requireWrite &&
    isAssignedServiceCallsOnly(granted) &&
    (normalized.includes("/service-calls/new") || normalized.includes("/edit"))
  ) {
    return false;
  }

  return true;
}
