import { PERMISSIONS, TENANT_PERMISSION_SLUGS, type PermissionSlug } from "./permissions.js";

/** Role slug for cross-tenant platform administrators. */
export const PLATFORM_ADMIN_ROLE_SLUG = "platform-admin";

/** Protected organization Owner/Master role slug. */
export const ORGANIZATION_OWNER_ROLE_SLUG = "organization-owner";

export interface DefaultRoleDefinition {
  slug: string;
  name: string;
  description: string;
  permissions: readonly PermissionSlug[];
  isSystem?: boolean;
  isOwner?: boolean;
}

const READ_ONLY_PERMISSIONS: readonly PermissionSlug[] = [
  PERMISSIONS.DASHBOARD_READ,
  PERMISSIONS.ORGANIZATIONS_READ,
  PERMISSIONS.COMPANIES_READ,
  PERMISSIONS.BRANCHES_READ,
  PERMISSIONS.CUSTOMERS_READ,
  PERMISSIONS.EQUIPMENT_READ,
  PERMISSIONS.SERVICE_CALLS_READ,
  PERMISSIONS.TECHNICIANS_READ,
  PERMISSIONS.CALENDAR_READ,
  PERMISSIONS.INVENTORY_READ,
  PERMISSIONS.PURCHASE_ORDERS_READ,
  PERMISSIONS.PARTS_READ,
  PERMISSIONS.ACCOUNTING_READ,
  PERMISSIONS.USERS_READ,
  PERMISSIONS.ROLES_READ,
  PERMISSIONS.REPORTS_READ,
];

/** Default tenant roles and their permission sets (configurable via RolePermission in DB). */
export const DEFAULT_ROLES: readonly DefaultRoleDefinition[] = [
  {
    slug: PLATFORM_ADMIN_ROLE_SLUG,
    name: "Platform Admin",
    description: "Cross-tenant platform administration",
    permissions: [PERMISSIONS.PLATFORM_ADMIN],
  },
  {
    slug: "system-administrator",
    name: "System Administrator",
    description: "Delegated administrator with broad access via assigned modules (non-owner)",
    permissions: TENANT_PERMISSION_SLUGS,
    isSystem: true,
  },
  {
    slug: ORGANIZATION_OWNER_ROLE_SLUG,
    name: "Organization Owner",
    description: "Protected organization master with full module access",
    permissions: TENANT_PERMISSION_SLUGS,
    isSystem: true,
    isOwner: true,
  },
  {
    slug: "service-manager",
    name: "Service Manager",
    description: "Manage field service operations and teams",
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.COMPANIES_READ,
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_WRITE,
      PERMISSIONS.EQUIPMENT_READ,
      PERMISSIONS.EQUIPMENT_WRITE,
      PERMISSIONS.SERVICE_CALLS_READ,
      PERMISSIONS.SERVICE_CALLS_WRITE,
      PERMISSIONS.SERVICE_CALLS_ASSIGN,
      PERMISSIONS.SERVICE_CALLS_CLOSE,
      PERMISSIONS.TECHNICIANS_READ,
      PERMISSIONS.CALENDAR_READ,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.REPORTS_READ,
    ],
  },
  {
    slug: "service-coordinator",
    name: "Service Coordinator",
    description: "Schedule and coordinate service calls",
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.EQUIPMENT_READ,
      PERMISSIONS.SERVICE_CALLS_READ,
      PERMISSIONS.SERVICE_CALLS_WRITE,
      PERMISSIONS.TECHNICIANS_READ,
      PERMISSIONS.CALENDAR_READ,
    ],
  },
  {
    slug: "technician",
    name: "Technician",
    description: "Field technician with assigned work access",
    permissions: [
      PERMISSIONS.MY_SERVICE_CALLS_READ,
      PERMISSIONS.MY_SERVICE_CALLS_WRITE,
      PERMISSIONS.MY_EQUIPMENT_READ,
      PERMISSIONS.MY_SCHEDULE_READ,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.EQUIPMENT_READ,
    ],
  },
  {
    slug: "parts-manager",
    name: "Parts Manager",
    description: "Manage parts, inventory, and purchasing",
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_WRITE,
      PERMISSIONS.PURCHASE_ORDERS_READ,
      PERMISSIONS.PURCHASE_ORDERS_WRITE,
      PERMISSIONS.PARTS_READ,
      PERMISSIONS.PARTS_WRITE,
    ],
  },
  {
    slug: "warehouse-employee",
    name: "Warehouse Employee",
    description: "Warehouse inventory and parts operations",
    permissions: [
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_WRITE,
      PERMISSIONS.PURCHASE_ORDERS_READ,
      PERMISSIONS.PARTS_READ,
      PERMISSIONS.PARTS_WRITE,
    ],
  },
  {
    slug: "accounting",
    name: "Accounting",
    description: "Financial and accounting operations",
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.ACCOUNTING_READ,
      PERMISSIONS.ACCOUNTING_WRITE,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.SERVICE_CALLS_READ,
      PERMISSIONS.PURCHASE_ORDERS_READ,
      PERMISSIONS.REPORTS_READ,
    ],
  },
  {
    slug: "read-only",
    name: "Read Only",
    description: "View-only access across modules",
    permissions: READ_ONLY_PERMISSIONS,
  },
] as const;

export function getDefaultRolePermissions(roleSlug: string): readonly PermissionSlug[] {
  const role = DEFAULT_ROLES.find((entry) => entry.slug === roleSlug);
  return role?.permissions ?? [];
}
