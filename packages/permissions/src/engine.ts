import { PERMISSIONS, type PermissionSlug } from "./permissions.js";

export type PermissionInput = PermissionSlug | string;

export interface PermissionCarrier {
  permissions: Array<{ slug: string } | string>;
}

function toPermissionSet(permissions: Iterable<PermissionInput>): Set<string> {
  return new Set(Array.from(permissions, (permission) => String(permission)));
}

export function extractPermissionSlugs(permissions: Array<{ slug: string } | string>): string[] {
  return permissions.map((permission) =>
    typeof permission === "string" ? permission : permission.slug,
  );
}

export function mergePermissionSlugs(
  permissionLists: readonly (readonly PermissionInput[])[],
): string[] {
  const merged = new Set<string>();
  for (const list of permissionLists) {
    for (const permission of list) {
      merged.add(String(permission));
    }
  }
  return Array.from(merged);
}

export function hasPermission(
  granted: Iterable<PermissionInput>,
  required: PermissionInput,
): boolean {
  return toPermissionSet(granted).has(String(required));
}

export function hasAnyPermission(
  granted: Iterable<PermissionInput>,
  required: readonly PermissionInput[],
): boolean {
  if (required.length === 0) {
    return true;
  }

  const grantedSet = toPermissionSet(granted);
  return required.some((permission) => grantedSet.has(String(permission)));
}

export function hasAllPermissions(
  granted: Iterable<PermissionInput>,
  required: readonly PermissionInput[],
): boolean {
  if (required.length === 0) {
    return true;
  }

  const grantedSet = toPermissionSet(granted);
  return required.every((permission) => grantedSet.has(String(permission)));
}

export function canReadServiceCalls(granted: Iterable<PermissionInput>): boolean {
  return hasAnyPermission(granted, [
    PERMISSIONS.SERVICE_CALLS_READ,
    PERMISSIONS.MY_SERVICE_CALLS_READ,
  ]);
}

export function canWriteServiceCalls(granted: Iterable<PermissionInput>): boolean {
  return hasPermission(granted, PERMISSIONS.SERVICE_CALLS_WRITE);
}

export function canReadCustomers(granted: Iterable<PermissionInput>): boolean {
  return hasPermission(granted, PERMISSIONS.CUSTOMERS_READ);
}

export function canWriteCustomers(granted: Iterable<PermissionInput>): boolean {
  return hasPermission(granted, PERMISSIONS.CUSTOMERS_WRITE);
}

export function canReadEquipment(granted: Iterable<PermissionInput>): boolean {
  return hasAnyPermission(granted, [PERMISSIONS.EQUIPMENT_READ, PERMISSIONS.MY_EQUIPMENT_READ]);
}

export function canWriteEquipment(granted: Iterable<PermissionInput>): boolean {
  return hasPermission(granted, PERMISSIONS.EQUIPMENT_WRITE);
}

export function canManageServiceCalls(granted: Iterable<PermissionInput>): boolean {
  return hasPermission(granted, PERMISSIONS.SERVICE_CALLS_READ);
}

export function canAssignServiceCalls(granted: Iterable<PermissionInput>): boolean {
  return hasPermission(granted, PERMISSIONS.SERVICE_CALLS_ASSIGN);
}

export function canCloseServiceCalls(granted: Iterable<PermissionInput>): boolean {
  return hasPermission(granted, PERMISSIONS.SERVICE_CALLS_CLOSE);
}

export function canWriteMyServiceCallFieldNotes(granted: Iterable<PermissionInput>): boolean {
  return hasPermission(granted, PERMISSIONS.MY_SERVICE_CALLS_WRITE);
}

export function isAssignedServiceCallsOnly(granted: Iterable<PermissionInput>): boolean {
  return (
    hasPermission(granted, PERMISSIONS.MY_SERVICE_CALLS_READ) &&
    !hasPermission(granted, PERMISSIONS.SERVICE_CALLS_READ)
  );
}

/** Whether the caller may perform cross-tenant platform operations. */
export function isPlatformAdmin(granted: Iterable<PermissionInput>): boolean {
  return hasPermission(granted, PERMISSIONS.PLATFORM_ADMIN);
}

export function permissionSlugsFromCarrier(user: PermissionCarrier | null | undefined): string[] {
  if (!user) {
    return [];
  }

  return extractPermissionSlugs(user.permissions);
}
