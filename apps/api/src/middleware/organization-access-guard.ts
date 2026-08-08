import { hasPermission, isPlatformAdmin, PERMISSIONS } from "@amarok-one/permissions";
import { createMiddleware } from "hono/factory";
import { forbidden } from "../lib/errors.js";
import { assertTenantOrganizationAccess } from "../lib/tenant.js";

/** Validates read access to an organization (tenant-scoped or platform admin cross-tenant). */
export function requireOrganizationReadAccess() {
  return createMiddleware(async (context, next) => {
    const auth = context.get("auth");
    const organizationId = context.req.param("organizationId");

    if (!organizationId) {
      throw forbidden("Organization identifier is required");
    }

    assertTenantOrganizationAccess(organizationId, auth.user.organizationId, auth.user.permissions);

    if (organizationId === auth.user.organizationId) {
      if (!hasPermission(auth.user.permissions, PERMISSIONS.ORGANIZATIONS_READ)) {
        throw forbidden("Insufficient permissions");
      }
    } else if (!isPlatformAdmin(auth.user.permissions)) {
      throw forbidden("Platform administrator privileges required");
    }

    await next();
  });
}

/** Validates write access to an organization (tenant-scoped or platform admin cross-tenant). */
export function requireOrganizationWriteAccess() {
  return createMiddleware(async (context, next) => {
    const auth = context.get("auth");
    const organizationId = context.req.param("organizationId");

    if (!organizationId) {
      throw forbidden("Organization identifier is required");
    }

    assertTenantOrganizationAccess(organizationId, auth.user.organizationId, auth.user.permissions);

    if (organizationId === auth.user.organizationId) {
      if (!hasPermission(auth.user.permissions, PERMISSIONS.ORGANIZATIONS_WRITE)) {
        throw forbidden("Insufficient permissions");
      }
    } else if (!isPlatformAdmin(auth.user.permissions)) {
      throw forbidden("Platform administrator privileges required");
    }

    await next();
  });
}
