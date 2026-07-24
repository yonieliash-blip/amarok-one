import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createApiResponse } from "@amarok-one/utils";
import { requirePermission } from "../../middleware/jwt-guard.js";
import {
  createOrganizationSchema,
  listOrganizationsQuerySchema,
  organizationIdParamSchema,
  updateOrganizationSchema,
} from "./organization.schemas.js";
import {
  createOrganization,
  getOrganizationById,
  listOrganizations,
  softDeleteOrganization,
  updateOrganization,
} from "./organization.service.js";

export const organizationRoutes = new Hono()
  .get(
    "/",
    requirePermission("organizations:read"),
    zValidator("query", listOrganizationsQuerySchema),
    async (context) => {
      const query = context.req.valid("query");
      const result = await listOrganizations(query.page?.toString(), query.pageSize?.toString());
      return context.json(createApiResponse(result.data, result.meta));
    },
  )
  .post(
    "/",
    requirePermission("organizations:write"),
    zValidator("json", createOrganizationSchema),
    async (context) => {
      const body = context.req.valid("json");
      const organization = await createOrganization(body);
      return context.json(createApiResponse(organization), 201);
    },
  )
  .get(
    "/:organizationId",
    requirePermission("organizations:read"),
    zValidator("param", organizationIdParamSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const organization = await getOrganizationById(organizationId);
      return context.json(createApiResponse(organization));
    },
  )
  .patch(
    "/:organizationId",
    requirePermission("organizations:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", updateOrganizationSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const body = context.req.valid("json");
      const organization = await updateOrganization(organizationId, body);
      return context.json(createApiResponse(organization));
    },
  )
  .delete(
    "/:organizationId",
    requirePermission("organizations:write"),
    zValidator("param", organizationIdParamSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      await softDeleteOrganization(organizationId);
      return context.body(null, 204);
    },
  );
