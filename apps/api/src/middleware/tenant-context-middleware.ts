import { createMiddleware } from "hono/factory";
import { runWithTenantContext } from "../lib/tenant-context.js";

/** Establishes the default tenant scope for the authenticated request. */
export const tenantContextMiddleware = createMiddleware(async (context, next) => {
  const auth = context.get("auth");
  return runWithTenantContext({ organizationId: auth.user.organizationId }, () => next());
});
