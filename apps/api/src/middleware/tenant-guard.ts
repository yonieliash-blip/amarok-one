import { createMiddleware } from "hono/factory";
import { assertTenantOrganization } from "../lib/tenant.js";

/** Validates URL organizationId matches the JWT tenant context. */
export const tenantGuard = createMiddleware(async (context, next) => {
  const organizationId = context.req.param("organizationId");
  if (organizationId) {
    const auth = context.get("auth");
    assertTenantOrganization(organizationId, auth.user.organizationId);
  }
  await next();
});
