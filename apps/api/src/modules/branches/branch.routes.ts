import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createApiResponse } from "@amarok-one/utils";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { companyIdParamSchema } from "../companies/company.schemas.js";
import {
  branchIdParamSchema,
  createBranchSchema,
  listBranchesQuerySchema,
  updateBranchSchema,
} from "./branch.schemas.js";
import {
  createBranch,
  getBranchById,
  listBranches,
  softDeleteBranch,
  updateBranch,
} from "./branch.service.js";

export const branchRoutes = new Hono()
  .use("*", tenantGuard)
  .get(
    "/",
    requirePermission("branches:read"),
    zValidator("param", companyIdParamSchema),
    zValidator("query", listBranchesQuerySchema),
    async (context) => {
      const { organizationId, companyId } = context.req.valid("param");
      const query = context.req.valid("query");
      const result = await listBranches(
        organizationId,
        companyId,
        query.page?.toString(),
        query.pageSize?.toString(),
      );
      return context.json(createApiResponse(result.data, result.meta));
    },
  )
  .post(
    "/",
    requirePermission("branches:write"),
    zValidator("param", companyIdParamSchema),
    zValidator("json", createBranchSchema),
    async (context) => {
      const { organizationId, companyId } = context.req.valid("param");
      const body = context.req.valid("json");
      const branch = await createBranch(organizationId, companyId, body);
      return context.json(createApiResponse(branch), 201);
    },
  )
  .get(
    "/:branchId",
    requirePermission("branches:read"),
    zValidator("param", branchIdParamSchema),
    async (context) => {
      const { organizationId, companyId, branchId } = context.req.valid("param");
      const branch = await getBranchById(organizationId, companyId, branchId);
      return context.json(createApiResponse(branch));
    },
  )
  .patch(
    "/:branchId",
    requirePermission("branches:write"),
    zValidator("param", branchIdParamSchema),
    zValidator("json", updateBranchSchema),
    async (context) => {
      const { organizationId, companyId, branchId } = context.req.valid("param");
      const body = context.req.valid("json");
      const branch = await updateBranch(organizationId, companyId, branchId, body);
      return context.json(createApiResponse(branch));
    },
  )
  .delete(
    "/:branchId",
    requirePermission("branches:write"),
    zValidator("param", branchIdParamSchema),
    async (context) => {
      const { organizationId, companyId, branchId } = context.req.valid("param");
      await softDeleteBranch(organizationId, companyId, branchId);
      return context.body(null, 204);
    },
  );
