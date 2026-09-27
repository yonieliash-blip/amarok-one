import { Hono } from "hono";
import { jwtGuard } from "./middleware/jwt-guard.js";
import { permissionsResolutionMiddleware } from "./middleware/permissions-resolution-middleware.js";
import { tenantContextMiddleware } from "./middleware/tenant-context-middleware.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { branchRoutes } from "./modules/branches/branch.routes.js";
import { companyRoutes } from "./modules/companies/company.routes.js";
import { createServiceCallRoutes } from "./modules/service-calls/service-call.routes.js";
import { equipmentRoutes } from "./modules/equipment/equipment.routes.js";
import { createCustomerRoutes } from "./modules/customers/customer.routes.js";
import type { MorningCustomerSyncService } from "./modules/morning/morning-customer-sync.service.js";
import { organizationRoutes } from "./modules/organizations/organization.routes.js";
import { createAccessRoutes } from "./modules/access/access.routes.js";
import { inventoryRoutes } from "./modules/inventory/inventory.routes.js";
import type { AccessService } from "./modules/access/access.service.js";
import type { ServiceCallService } from "./modules/service-calls/service-call.service.js";
import { partsRoutes } from "./modules/parts/parts.routes.js";
import { technicianRoutes } from "./modules/technicians/technician.routes.js";
import { attendanceRoutes } from "./modules/attendance/attendance.routes.js";

export function createApiRoutes(
  serviceCallService: ServiceCallService,
  accessService: AccessService,
  morningCustomerSyncService: MorningCustomerSyncService,
): Hono {
  const protectedRoutes = new Hono()
    .use("*", jwtGuard)
    .use("*", tenantContextMiddleware)
    .use("*", permissionsResolutionMiddleware)
    .route("/organizations", organizationRoutes)
    .route("/organizations/:organizationId/access", createAccessRoutes(accessService))
    .route("/organizations/:organizationId/companies", companyRoutes)
    .route("/organizations/:organizationId/companies/:companyId/branches", branchRoutes)
    .route(
      "/organizations/:organizationId/customers",
      createCustomerRoutes(morningCustomerSyncService),
    )
    .route("/organizations/:organizationId/equipment", equipmentRoutes)
    .route("/organizations/:organizationId/technicians", technicianRoutes)
    .route("/organizations/:organizationId/attendance", attendanceRoutes)
    .route("/organizations/:organizationId/inventory", inventoryRoutes)
    .route("/organizations/:organizationId/parts", partsRoutes)
    .route(
      "/organizations/:organizationId/service-calls",
      createServiceCallRoutes(serviceCallService),
    );

  return new Hono().route("/auth", authRoutes).route("/", protectedRoutes);
}
