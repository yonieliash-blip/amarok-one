import { createMiddleware } from "hono/factory";
import { assertTenantOrganizationAccess } from "../lib/tenant.js";

/** Validates URL organizationId matches JWT tenant context or platform admin cross-tenant access. */
export const tenantGuard = createMiddleware(async (context, next) => {
  const organizationId = context.req.param("organizationId");
  if (organizationId) {
    const auth = context.get("auth");
    assertTenantOrganizationAccess(organizationId, auth.user.organizationId, auth.user.permissions);
  }
  await next();
});
