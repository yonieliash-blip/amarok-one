import { Hono } from "hono";
import { jwtGuard } from "./middleware/jwt-guard.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { branchRoutes } from "./modules/branches/branch.routes.js";
import { companyRoutes } from "./modules/companies/company.routes.js";
import { serviceCallRoutes } from "./modules/service-calls/service-call.routes.js";
import { equipmentRoutes } from "./modules/equipment/equipment.routes.js";
import { customerRoutes } from "./modules/customers/customer.routes.js";
import { organizationRoutes } from "./modules/organizations/organization.routes.js";

const protectedRoutes = new Hono()
  .use("*", jwtGuard)
  .route("/organizations", organizationRoutes)
  .route("/organizations/:organizationId/companies", companyRoutes)
  .route("/organizations/:organizationId/companies/:companyId/branches", branchRoutes)
  .route("/organizations/:organizationId/customers", customerRoutes)
  .route("/organizations/:organizationId/equipment", equipmentRoutes)
  .route("/organizations/:organizationId/service-calls", serviceCallRoutes);

export const apiRoutes = new Hono().route("/auth", authRoutes).route("/", protectedRoutes);
