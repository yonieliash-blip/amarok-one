import { PERMISSIONS, type PermissionSlug } from "./permissions.js";
import { hasAnyPermission } from "./engine.js";
import { canAccessPath } from "./routes.js";
import { getDashboardForRole, getRoleLandingPath } from "./landing.js";

export type NavLabelKey =
  | "managementDashboard"
  | "executiveDashboard"
  | "serviceDashboard"
  | "warehouseDashboard"
  | "accountingDashboard"
  | "officeDashboard"
  | "readOnlyDashboard"
  | "dashboard"
  | "customers"
  | "equipment"
  | "serviceCalls"
  | "completedServiceCalls"
  | "myServiceCalls"
  | "myEquipment"
  | "mySchedule"
  | "technicians"
  | "calendar"
  | "inventory"
  | "purchaseOrders"
  | "parts"
  | "tasks"
  | "documentCases"
  | "chat"
  | "accounting"
  | "greenInvoiceQueries"
  | "reports"
  | "messages"
  | "memberAccess"
  | "inspiration";

export interface NavigationItemDefinition {
  id: string;
  to: string;
  labelKey: NavLabelKey;
  end?: boolean;
  /** User must hold at least one of these permissions to see the nav item. */
  permissions: readonly PermissionSlug[];
  /** When true the route exists but shows a coming-soon placeholder. */
  placeholder?: boolean;
  /** Restrict an item to named primary roles when the workspace needs a dedicated flow. */
  roleSlugs?: readonly string[];
  /** Hide a generic item for roles that receive a more specific replacement. */
  excludeRoleSlugs?: readonly string[];
}

export const NAVIGATION_ITEMS: readonly NavigationItemDefinition[] = [
  {
    id: "service-calls",
    to: "/service-calls",
    labelKey: "serviceCalls",
    permissions: [PERMISSIONS.SERVICE_CALLS_READ],
    excludeRoleSlugs: ["accounting"],
  },
  {
    id: "completed-service-calls",
    to: "/service-calls?view=completed",
    labelKey: "completedServiceCalls",
    permissions: [PERMISSIONS.SERVICE_CALLS_READ],
    roleSlugs: ["accounting"],
  },
  {
    id: "my-service-calls",
    to: "/my/service-calls",
    labelKey: "myServiceCalls",
    permissions: [PERMISSIONS.MY_SERVICE_CALLS_READ],
  },
  {
    id: "customers",
    to: "/customers",
    labelKey: "customers",
    permissions: [PERMISSIONS.CUSTOMERS_READ],
  },
  {
    id: "equipment",
    to: "/equipment",
    labelKey: "equipment",
    permissions: [PERMISSIONS.EQUIPMENT_READ],
  },
  {
    id: "my-equipment",
    to: "/my/equipment",
    labelKey: "myEquipment",
    permissions: [PERMISSIONS.MY_EQUIPMENT_READ],
  },
  {
    id: "technicians",
    to: "/technicians",
    labelKey: "technicians",
    permissions: [PERMISSIONS.TECHNICIANS_READ],
  },
  {
    id: "calendar",
    to: "/calendar",
    labelKey: "calendar",
    permissions: [PERMISSIONS.CALENDAR_READ],
  },
  {
    id: "my-schedule",
    to: "/my/schedule",
    labelKey: "mySchedule",
    permissions: [PERMISSIONS.MY_SCHEDULE_READ],
  },
  {
    id: "inventory",
    to: "/inventory",
    labelKey: "inventory",
    permissions: [PERMISSIONS.INVENTORY_READ],
  },
  {
    id: "purchase-orders",
    to: "/purchase-orders",
    labelKey: "purchaseOrders",
    permissions: [PERMISSIONS.PURCHASE_ORDERS_READ],
    excludeRoleSlugs: ["accounting"],
  },
  {
    id: "parts",
    to: "/parts",
    labelKey: "parts",
    permissions: [PERMISSIONS.PARTS_READ],
  },
  {
    id: "tasks",
    to: "/tasks",
    labelKey: "tasks",
    permissions: [PERMISSIONS.TASKS_READ],
  },
  {
    id: "document-cases",
    to: "/document-cases",
    labelKey: "documentCases",
    permissions: [PERMISSIONS.DOCUMENT_CASES_READ],
  },
  {
    id: "messages",
    to: "/messages",
    labelKey: "messages",
    permissions: [PERMISSIONS.MESSAGES_READ],
    excludeRoleSlugs: ["accounting"],
  },
  {
    id: "office-chat",
    to: "/messages",
    labelKey: "chat",
    permissions: [PERMISSIONS.MESSAGES_READ],
    roleSlugs: ["accounting"],
  },
  {
    id: "accounting",
    to: "/accounting",
    labelKey: "accounting",
    permissions: [PERMISSIONS.ACCOUNTING_READ],
    excludeRoleSlugs: ["accounting"],
  },
  {
    id: "green-invoice-queries",
    to: "/green-invoice-queries",
    labelKey: "greenInvoiceQueries",
    permissions: [PERMISSIONS.ACCOUNTING_READ],
    roleSlugs: ["accounting"],
  },
  {
    id: "reports",
    to: "/reports",
    labelKey: "reports",
    permissions: [PERMISSIONS.REPORTS_READ],
    excludeRoleSlugs: ["accounting"],
  },
  {
    id: "member-access",
    to: "/administration/member-access",
    labelKey: "memberAccess",
    permissions: [PERMISSIONS.USERS_READ],
  },
  {
    id: "inspiration",
    to: "/administration/inspiration",
    labelKey: "inspiration",
    permissions: [PERMISSIONS.USERS_WRITE],
  },
] as const;

export interface BuildNavigationOptions {
  isOrganizationOwner?: boolean;
}

export interface ResolvedNavigationItem extends NavigationItemDefinition {
  enabled: boolean;
}

export function buildNavigationItems(
  granted: Iterable<string>,
  activeRoleSlug?: string,
  options?: BuildNavigationOptions,
): ResolvedNavigationItem[] {
  const items = NAVIGATION_ITEMS.map((item) => ({
    ...item,
    enabled:
      hasAnyPermission(granted, item.permissions) &&
      (item.id !== "member-access" || options?.isOrganizationOwner === true) &&
      (!item.roleSlugs ||
        (activeRoleSlug !== undefined && item.roleSlugs.includes(activeRoleSlug))) &&
      !item.excludeRoleSlugs?.includes(activeRoleSlug ?? ""),
  })).filter((item) => item.enabled);

  const roleDashboard = getDashboardForRole(activeRoleSlug);
  if (roleDashboard && canAccessPath(roleDashboard.path, granted, { activeRoleSlug })) {
    const dashboardNav: ResolvedNavigationItem = {
      id: `dashboard-${roleDashboard.kind}`,
      to: roleDashboard.path,
      labelKey: roleDashboard.labelKey,
      end: true,
      permissions: roleDashboard.permissions as readonly PermissionSlug[],
      enabled: true,
    };
    return [dashboardNav, ...items];
  }

  return items;
}

export function getDefaultLandingPath(granted: Iterable<string>, activeRoleSlug?: string): string {
  const roleLanding = getRoleLandingPath(activeRoleSlug);
  if (roleLanding) {
    return canAccessPath(roleLanding, granted, { activeRoleSlug }) ? roleLanding : "/unauthorized";
  }

  const items = buildNavigationItems(granted, activeRoleSlug);
  return items[0]?.to ?? "/unauthorized";
}

const BLOCKED_REDIRECT_PATHS = new Set(["/login", "/unauthorized"]);

/** Pick the first authorized route, optionally honoring a preferred path when allowed. */
export function resolveAuthorizedPath(
  granted: Iterable<string>,
  preferredPath?: string,
  activeRoleSlug?: string,
): string {
  const landingPath = getDefaultLandingPath(granted, activeRoleSlug);
  const normalizedPreferred = preferredPath?.replace(/\/+$/, "") || "";

  if (
    !normalizedPreferred ||
    BLOCKED_REDIRECT_PATHS.has(normalizedPreferred) ||
    normalizedPreferred === "/"
  ) {
    return landingPath;
  }

  if (canAccessPath(normalizedPreferred, granted, { activeRoleSlug })) {
    return normalizedPreferred;
  }

  return landingPath;
}
