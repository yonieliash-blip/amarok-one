import { TENANT_PERMISSION_SLUGS, type PermissionSlug } from "./permissions.js";
import { ORGANIZATION_OWNER_ROLE_SLUG } from "./roles.js";
import { expandEnabledModules, isModuleKey, type ModuleKey } from "./modules.js";

export { ORGANIZATION_OWNER_ROLE_SLUG };

export interface EffectivePermissionInput {
  isOrganizationOwner: boolean;
  primaryRoleSlug: string;
  primaryRoleIsOwner: boolean;
  enabledModules: readonly string[];
}

export interface EffectivePermissionResult {
  permissions: PermissionSlug[];
  enabledModules: ModuleKey[];
  isOrganizationOwner: boolean;
}

function normalizeEnabledModules(values: readonly string[]): ModuleKey[] {
  const modules: ModuleKey[] = [];
  for (const value of values) {
    if (isModuleKey(value)) {
      modules.push(value);
    }
  }
  return modules;
}

/** Central authorization resolver — API and UI must use this. */
export function resolveEffectivePermissions(
  input: EffectivePermissionInput,
): EffectivePermissionResult {
  const isOwner =
    input.isOrganizationOwner ||
    input.primaryRoleIsOwner ||
    input.primaryRoleSlug === ORGANIZATION_OWNER_ROLE_SLUG;

  if (isOwner) {
    return {
      permissions: [...TENANT_PERMISSION_SLUGS],
      enabledModules: ["core", "service", "inventory", "finance", "administration"],
      isOrganizationOwner: true,
    };
  }

  const enabledModules = normalizeEnabledModules(input.enabledModules);
  const permissions = expandEnabledModules(enabledModules);

  return {
    permissions,
    enabledModules,
    isOrganizationOwner: false,
  };
}

export function isOrganizationOwnerRole(roleSlug: string, roleIsOwner = false): boolean {
  return roleIsOwner || roleSlug === ORGANIZATION_OWNER_ROLE_SLUG;
}
