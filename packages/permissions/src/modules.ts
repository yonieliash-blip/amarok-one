import { PERMISSIONS, type PermissionSlug } from "./permissions.js";

/** Configurable organization module keys (CTO-approved initial set). */
export const MODULE_KEYS = ["core", "service", "inventory", "finance", "administration"] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export interface ModuleActionPermissions {
  view: readonly PermissionSlug[];
  create: readonly PermissionSlug[];
  edit: readonly PermissionSlug[];
  approve: readonly PermissionSlug[];
  delete: readonly PermissionSlug[];
}

export interface ModuleDefinition {
  key: ModuleKey;
  name: string;
  description: string;
  actions: ModuleActionPermissions;
}

function flattenActions(actions: ModuleActionPermissions): PermissionSlug[] {
  const merged = new Set<PermissionSlug>();
  for (const bucket of Object.values(actions)) {
    for (const slug of bucket) {
      merged.add(slug);
    }
  }
  return Array.from(merged);
}

export const MODULE_DEFINITIONS: readonly ModuleDefinition[] = [
  {
    key: "core",
    name: "Core",
    description: "Dashboard and shared read access for field and office users",
    actions: {
      view: [
        PERMISSIONS.DASHBOARD_READ,
        PERMISSIONS.ORGANIZATIONS_READ,
        PERMISSIONS.COMPANIES_READ,
        PERMISSIONS.BRANCHES_READ,
        PERMISSIONS.CUSTOMERS_READ,
        PERMISSIONS.EQUIPMENT_READ,
        PERMISSIONS.MY_SERVICE_CALLS_READ,
        PERMISSIONS.MY_SERVICE_CALLS_WRITE,
        PERMISSIONS.MY_EQUIPMENT_READ,
        PERMISSIONS.MY_SCHEDULE_READ,
        PERMISSIONS.MY_ATTENDANCE_READ,
        PERMISSIONS.MY_ATTENDANCE_WRITE,
      ],
      create: [],
      edit: [],
      approve: [],
      delete: [],
    },
  },
  {
    key: "service",
    name: "Service",
    description: "Field service operations, dispatch, and service call management",
    actions: {
      view: [
        PERMISSIONS.SERVICE_CALLS_READ,
        PERMISSIONS.TECHNICIANS_READ,
        PERMISSIONS.CALENDAR_READ,
        PERMISSIONS.REPORTS_READ,
        PERMISSIONS.ATTENDANCE_READ,
      ],
      create: [PERMISSIONS.SERVICE_CALLS_WRITE],
      edit: [PERMISSIONS.SERVICE_CALLS_WRITE, PERMISSIONS.SERVICE_CALLS_ASSIGN],
      approve: [PERMISSIONS.SERVICE_CALLS_CLOSE, PERMISSIONS.ATTENDANCE_WRITE],
      delete: [],
    },
  },
  {
    key: "inventory",
    name: "Inventory",
    description: "Parts, warehouse, and purchase order operations",
    actions: {
      view: [PERMISSIONS.INVENTORY_READ, PERMISSIONS.PURCHASE_ORDERS_READ, PERMISSIONS.PARTS_READ],
      create: [
        PERMISSIONS.INVENTORY_WRITE,
        PERMISSIONS.PURCHASE_ORDERS_WRITE,
        PERMISSIONS.PARTS_WRITE,
      ],
      edit: [
        PERMISSIONS.INVENTORY_WRITE,
        PERMISSIONS.PURCHASE_ORDERS_WRITE,
        PERMISSIONS.PARTS_WRITE,
      ],
      approve: [],
      delete: [],
    },
  },
  {
    key: "finance",
    name: "Finance",
    description: "Accounting and financial reporting",
    actions: {
      view: [PERMISSIONS.ACCOUNTING_READ, PERMISSIONS.REPORTS_READ],
      create: [PERMISSIONS.ACCOUNTING_WRITE],
      edit: [PERMISSIONS.ACCOUNTING_WRITE],
      approve: [],
      delete: [],
    },
  },
  {
    key: "administration",
    name: "Administration",
    description: "Organization structure and user access administration",
    actions: {
      view: [
        PERMISSIONS.USERS_READ,
        PERMISSIONS.ROLES_READ,
        PERMISSIONS.COMPANIES_WRITE,
        PERMISSIONS.BRANCHES_WRITE,
      ],
      create: [PERMISSIONS.USERS_WRITE, PERMISSIONS.ROLES_WRITE],
      edit: [PERMISSIONS.USERS_WRITE, PERMISSIONS.ROLES_WRITE],
      approve: [],
      delete: [],
    },
  },
] as const;

const moduleByKey = new Map<ModuleKey, ModuleDefinition>(
  MODULE_DEFINITIONS.map((definition) => [definition.key, definition]),
);

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}

export function getModuleDefinition(key: ModuleKey): ModuleDefinition {
  const definition = moduleByKey.get(key);
  if (!definition) {
    throw new Error(`Unknown module key: ${key}`);
  }
  return definition;
}

/** All permission slugs granted by a module when enabled. */
export function expandModulePermissions(moduleKey: ModuleKey): PermissionSlug[] {
  return flattenActions(getModuleDefinition(moduleKey).actions);
}

/** Union of permissions for all enabled modules. */
export function expandEnabledModules(enabledModules: Iterable<ModuleKey>): PermissionSlug[] {
  const merged = new Set<PermissionSlug>();
  for (const moduleKey of enabledModules) {
    for (const slug of expandModulePermissions(moduleKey)) {
      merged.add(slug);
    }
  }
  return Array.from(merged);
}
