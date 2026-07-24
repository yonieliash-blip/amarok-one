import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createApiResponse } from "@amarok-one/utils";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import {
  companyIdParamSchema,
  createCompanySchema,
  listCompaniesQuerySchema,
  updateCompanySchema,
} from "./company.schemas.js";
import {
  createCompany,
  getCompanyById,
  listCompanies,
  softDeleteCompany,
  updateCompany,
} from "./company.service.js";

export const companyRoutes = new Hono()
  .use("*", tenantGuard)
  .get(
    "/",
    requirePermission("companies:read"),
    zValidator("param", organizationIdParamSchema),
    zValidator("query", listCompaniesQuerySchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const query = context.req.valid("query");
      const result = await listCompanies(
        organizationId,
        query.page?.toString(),
        query.pageSize?.toString(),
      );
      return context.json(createApiResponse(result.data, result.meta));
    },
  )
  .post(
    "/",
    requirePermission("companies:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createCompanySchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const body = context.req.valid("json");
      const company = await createCompany(organizationId, body);
      return context.json(createApiResponse(company), 201);
    },
  )
  .get(
    "/:companyId",
    requirePermission("companies:read"),
    zValidator("param", companyIdParamSchema),
    async (context) => {
      const { organizationId, companyId } = context.req.valid("param");
      const company = await getCompanyById(organizationId, companyId);
      return context.json(createApiResponse(company));
    },
  )
  .patch(
    "/:companyId",
    requirePermission("companies:write"),
    zValidator("param", companyIdParamSchema),
    zValidator("json", updateCompanySchema),
    async (context) => {
      const { organizationId, companyId } = context.req.valid("param");
      const body = context.req.valid("json");
      const company = await updateCompany(organizationId, companyId, body);
      return context.json(createApiResponse(company));
    },
  )
  .delete(
    "/:companyId",
    requirePermission("companies:write"),
    zValidator("param", companyIdParamSchema),
    async (context) => {
      const { organizationId, companyId } = context.req.valid("param");
      await softDeleteCompany(organizationId, companyId);
      return context.body(null, 204);
    },
  );
