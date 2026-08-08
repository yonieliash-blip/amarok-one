export {
  ALL_PERMISSIONS,
  ALL_PERMISSION_SLUGS,
  PERMISSIONS,
  TENANT_PERMISSION_SLUGS,
  type PermissionDefinition,
  type PermissionSlug,
} from "./permissions.js";
export {
  DEFAULT_ROLES,
  getDefaultRolePermissions,
  ORGANIZATION_OWNER_ROLE_SLUG,
  PLATFORM_ADMIN_ROLE_SLUG,
  type DefaultRoleDefinition,
} from "./roles.js";
export {
  resolveEffectivePermissions,
  isOrganizationOwnerRole,
  type EffectivePermissionInput,
  type EffectivePermissionResult,
} from "./effective-permissions.js";
export {
  MODULE_DEFINITIONS,
  MODULE_KEYS,
  expandEnabledModules,
  expandModulePermissions,
  getModuleDefinition,
  isModuleKey,
  type ModuleActionPermissions,
  type ModuleDefinition,
  type ModuleKey,
} from "./modules.js";
export { ROLE_MODULE_TEMPLATES, getDefaultModulesForRole } from "./role-module-templates.js";
export {
  canAssignServiceCalls,
  canCloseServiceCalls,
  canManageServiceCalls,
  canReadCustomers,
  canReadEquipment,
  canReadServiceCalls,
  canWriteCustomers,
  canWriteEquipment,
  canWriteMyServiceCallFieldNotes,
  canWriteServiceCalls,
  extractPermissionSlugs,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isAssignedServiceCallsOnly,
  isPlatformAdmin,
  mergePermissionSlugs,
  permissionSlugsFromCarrier,
  type PermissionCarrier,
  type PermissionInput,
} from "./engine.js";
export {
  buildNavigationItems,
  getDefaultLandingPath,
  resolveAuthorizedPath,
  NAVIGATION_ITEMS,
  type BuildNavigationOptions,
  type NavLabelKey,
  type NavigationItemDefinition,
  type ResolvedNavigationItem,
} from "./navigation.js";
export { ROLE_DASHBOARDS, ROLE_LANDING_PATHS } from "./landing.js";
export {
  getDashboardForRole,
  getRoleLandingPath,
  canAccessRoleLanding,
  type DashboardKind,
  type DashboardNavLabelKey,
  type RoleDashboardDefinition,
} from "./landing.js";
export {
  APP_ROUTE_ACCESS,
  canAccessPath,
  matchRouteAccess,
  type RouteAccessOptions,
  type RouteAccessRule,
} from "./routes.js";
