import { useMemo } from "react";
import {
  canAccessPath,
  canWriteCustomers,
  canWriteEquipment,
  canWriteServiceCalls,
  extractPermissionSlugs,
  hasAnyPermission,
  permissionSlugsFromCarrier,
  type RouteAccessOptions,
} from "@amarok-one/permissions";
import { useAuth } from "./useAuth";

export function usePermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    const slugs = permissionSlugsFromCarrier(user);
    const activeRoleSlug = user?.role.slug;

    return {
      slugs,
      activeRoleSlug,
      hasAny: (...permissions: string[]) => hasAnyPermission(slugs, permissions),
      canAccessPath: (pathname: string, options?: RouteAccessOptions) =>
        canAccessPath(pathname, slugs, { ...options, activeRoleSlug }),
      canWriteCustomers: () => canWriteCustomers(slugs),
      canWriteEquipment: () => canWriteEquipment(slugs),
      canWriteServiceCalls: () => canWriteServiceCalls(slugs),
    };
  }, [user]);
}

export function usePermissionSlugs(): string[] {
  const { user } = useAuth();
  return useMemo(() => extractPermissionSlugs(user?.permissions ?? []), [user]);
}
