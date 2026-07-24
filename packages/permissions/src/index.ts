export {
  ALL_PERMISSIONS,
  ALL_PERMISSION_SLUGS,
  PERMISSIONS,
  type PermissionDefinition,
  type PermissionSlug,
} from "./permissions.js";
export { DEFAULT_ROLES, getDefaultRolePermissions, type DefaultRoleDefinition } from "./roles.js";
export {
  canManageServiceCalls,
  canReadCustomers,
  canReadEquipment,
  canReadServiceCalls,
  canWriteCustomers,
  canWriteEquipment,
  canWriteServiceCalls,
  extractPermissionSlugs,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isAssignedServiceCallsOnly,
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
