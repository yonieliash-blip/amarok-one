/** Canonical permission slugs for AMAROK ONE RBAC. */
export const PERMISSIONS = {
  /** Cross-tenant platform operations (organization provisioning, cross-org administration). */
  PLATFORM_ADMIN: "platform:admin",
  DASHBOARD_READ: "dashboard:read",
  ORGANIZATIONS_READ: "organizations:read",
  ORGANIZATIONS_WRITE: "organizations:write",
  COMPANIES_READ: "companies:read",
  COMPANIES_WRITE: "companies:write",
  BRANCHES_READ: "branches:read",
  BRANCHES_WRITE: "branches:write",
  CUSTOMERS_READ: "customers:read",
  CUSTOMERS_WRITE: "customers:write",
  EQUIPMENT_READ: "equipment:read",
  EQUIPMENT_WRITE: "equipment:write",
  SERVICE_CALLS_READ: "service_calls:read",
  SERVICE_CALLS_WRITE: "service_calls:write",
  SERVICE_CALLS_ASSIGN: "service_calls:assign",
  SERVICE_CALLS_CLOSE: "service_calls:close",
  MY_SERVICE_CALLS_READ: "my_service_calls:read",
  MY_SERVICE_CALLS_WRITE: "my_service_calls:write",
  MY_EQUIPMENT_READ: "my_equipment:read",
  MY_SCHEDULE_READ: "my_schedule:read",
  TECHNICIANS_READ: "technicians:read",
  TECHNICIANS_WRITE: "technicians:write",
  CALENDAR_READ: "calendar:read",
  INVENTORY_READ: "inventory:read",
  INVENTORY_WRITE: "inventory:write",
  PURCHASE_ORDERS_READ: "purchase_orders:read",
  PURCHASE_ORDERS_WRITE: "purchase_orders:write",
  PARTS_READ: "parts:read",
  PARTS_WRITE: "parts:write",
  ACCOUNTING_READ: "accounting:read",
  ACCOUNTING_WRITE: "accounting:write",
  USERS_READ: "users:read",
  USERS_WRITE: "users:write",
  ROLES_READ: "roles:read",
  ROLES_WRITE: "roles:write",
  REPORTS_READ: "reports:read",
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionDefinition {
  slug: PermissionSlug;
  name: string;
  description: string;
}

export const ALL_PERMISSIONS: readonly PermissionDefinition[] = [
  {
    slug: PERMISSIONS.PLATFORM_ADMIN,
    name: "Platform Administrator",
    description: "Perform cross-tenant platform operations",
  },
  {
    slug: PERMISSIONS.DASHBOARD_READ,
    name: "Read Dashboard",
    description: "View the operations dashboard",
  },
  {
    slug: PERMISSIONS.ORGANIZATIONS_READ,
    name: "Read Organizations",
    description: "View organizations",
  },
  {
    slug: PERMISSIONS.ORGANIZATIONS_WRITE,
    name: "Write Organizations",
    description: "Manage organizations",
  },
  {
    slug: PERMISSIONS.COMPANIES_READ,
    name: "Read Companies",
    description: "View companies",
  },
  {
    slug: PERMISSIONS.COMPANIES_WRITE,
    name: "Write Companies",
    description: "Manage companies",
  },
  {
    slug: PERMISSIONS.BRANCHES_READ,
    name: "Read Branches",
    description: "View branches",
  },
  {
    slug: PERMISSIONS.BRANCHES_WRITE,
    name: "Write Branches",
    description: "Manage branches",
  },
  {
    slug: PERMISSIONS.CUSTOMERS_READ,
    name: "Read Customers",
    description: "View customers",
  },
  {
    slug: PERMISSIONS.CUSTOMERS_WRITE,
    name: "Write Customers",
    description: "Manage customers",
  },
  {
    slug: PERMISSIONS.EQUIPMENT_READ,
    name: "Read Equipment",
    description: "View equipment",
  },
  {
    slug: PERMISSIONS.EQUIPMENT_WRITE,
    name: "Write Equipment",
    description: "Manage equipment",
  },
  {
    slug: PERMISSIONS.SERVICE_CALLS_READ,
    name: "Read Service Calls",
    description: "View all service calls",
  },
  {
    slug: PERMISSIONS.SERVICE_CALLS_WRITE,
    name: "Write Service Calls",
    description: "Update service call metadata (not lifecycle)",
  },
  {
    slug: PERMISSIONS.SERVICE_CALLS_ASSIGN,
    name: "Assign Service Calls",
    description: "Assign technicians and manage service call lifecycle",
  },
  {
    slug: PERMISSIONS.SERVICE_CALLS_CLOSE,
    name: "Close Service Calls",
    description: "Close service calls after manager review",
  },
  {
    slug: PERMISSIONS.MY_SERVICE_CALLS_READ,
    name: "Read My Service Calls",
    description: "View assigned service calls",
  },
  {
    slug: PERMISSIONS.MY_SERVICE_CALLS_WRITE,
    name: "Update My Service Calls",
    description: "Update field notes on assigned service calls",
  },
  {
    slug: PERMISSIONS.MY_EQUIPMENT_READ,
    name: "Read My Equipment",
    description: "View assigned equipment",
  },
  {
    slug: PERMISSIONS.MY_SCHEDULE_READ,
    name: "Read My Schedule",
    description: "View personal schedule",
  },
  {
    slug: PERMISSIONS.TECHNICIANS_READ,
    name: "Read Technicians",
    description: "View technicians",
  },
  {
    slug: PERMISSIONS.TECHNICIANS_WRITE,
    name: "Write Technicians",
    description: "Manage technicians",
  },
  {
    slug: PERMISSIONS.CALENDAR_READ,
    name: "Read Calendar",
    description: "View service calendar",
  },
  {
    slug: PERMISSIONS.INVENTORY_READ,
    name: "Read Inventory",
    description: "View inventory",
  },
  {
    slug: PERMISSIONS.INVENTORY_WRITE,
    name: "Write Inventory",
    description: "Manage inventory",
  },
  {
    slug: PERMISSIONS.PURCHASE_ORDERS_READ,
    name: "Read Purchase Orders",
    description: "View purchase orders",
  },
  {
    slug: PERMISSIONS.PURCHASE_ORDERS_WRITE,
    name: "Write Purchase Orders",
    description: "Manage purchase orders",
  },
  {
    slug: PERMISSIONS.PARTS_READ,
    name: "Read Parts",
    description: "View parts catalog",
  },
  {
    slug: PERMISSIONS.PARTS_WRITE,
    name: "Write Parts",
    description: "Manage parts catalog",
  },
  {
    slug: PERMISSIONS.ACCOUNTING_READ,
    name: "Read Accounting",
    description: "View accounting data",
  },
  {
    slug: PERMISSIONS.ACCOUNTING_WRITE,
    name: "Write Accounting",
    description: "Manage accounting data",
  },
  {
    slug: PERMISSIONS.USERS_READ,
    name: "Read Users",
    description: "View users",
  },
  {
    slug: PERMISSIONS.USERS_WRITE,
    name: "Write Users",
    description: "Manage users",
  },
  {
    slug: PERMISSIONS.ROLES_READ,
    name: "Read Roles",
    description: "View roles",
  },
  {
    slug: PERMISSIONS.ROLES_WRITE,
    name: "Write Roles",
    description: "Manage roles",
  },
  {
    slug: PERMISSIONS.REPORTS_READ,
    name: "Read Reports",
    description: "View reports",
  },
] as const;

export const ALL_PERMISSION_SLUGS: readonly PermissionSlug[] = ALL_PERMISSIONS.map(
  (permission) => permission.slug,
);

/** Tenant-scoped permissions (excludes cross-tenant platform administration). */
export const TENANT_PERMISSION_SLUGS: readonly PermissionSlug[] = ALL_PERMISSION_SLUGS.filter(
  (slug) => slug !== PERMISSIONS.PLATFORM_ADMIN,
);
