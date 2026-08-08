import { Hono } from "hono";
import { jwtGuard } from "./middleware/jwt-guard.js";
import { permissionsResolutionMiddleware } from "./middleware/permissions-resolution-middleware.js";
import { tenantContextMiddleware } from "./middleware/tenant-context-middleware.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { branchRoutes } from "./modules/branches/branch.routes.js";
import { companyRoutes } from "./modules/companies/company.routes.js";
import { createServiceCallRoutes } from "./modules/service-calls/service-call.routes.js";
import { equipmentRoutes } from "./modules/equipment/equipment.routes.js";
import { customerRoutes } from "./modules/customers/customer.routes.js";
import { organizationRoutes } from "./modules/organizations/organization.routes.js";
import { createAccessRoutes } from "./modules/access/access.routes.js";
import type { AccessService } from "./modules/access/access.service.js";
import type { ServiceCallService } from "./modules/service-calls/service-call.service.js";

export function createApiRoutes(
  serviceCallService: ServiceCallService,
  accessService: AccessService,
): Hono {
  const protectedRoutes = new Hono()
    .use("*", jwtGuard)
    .use("*", tenantContextMiddleware)
    .use("*", permissionsResolutionMiddleware)
    .route("/organizations", organizationRoutes)
    .route("/organizations/:organizationId/access", createAccessRoutes(accessService))
    .route("/organizations/:organizationId/companies", companyRoutes)
    .route("/organizations/:organizationId/companies/:companyId/branches", branchRoutes)
    .route("/organizations/:organizationId/customers", customerRoutes)
    .route("/organizations/:organizationId/equipment", equipmentRoutes)
    .route(
      "/organizations/:organizationId/service-calls",
      createServiceCallRoutes(serviceCallService),
    );

  return new Hono().route("/auth", authRoutes).route("/", protectedRoutes);
}
