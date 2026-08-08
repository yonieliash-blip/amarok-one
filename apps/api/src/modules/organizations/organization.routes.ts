import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { isPlatformAdmin } from "@amarok-one/permissions";
import { createApiResponse } from "@amarok-one/utils";
import { requirePermission } from "../../middleware/jwt-guard.js";
import {
  requireOrganizationReadAccess,
  requireOrganizationWriteAccess,
} from "../../middleware/organization-access-guard.js";
import { requirePlatformAdmin } from "../../middleware/platform-admin-guard.js";
import { runWithBypassTenantIsolation } from "../../lib/tenant-context.js";
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
  listOrganizationsForTenant,
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
      const auth = context.get("auth");

      const result = isPlatformAdmin(auth.user.permissions)
        ? await runWithBypassTenantIsolation(() =>
            listOrganizations(query.page?.toString(), query.pageSize?.toString()),
          )
        : await listOrganizationsForTenant(
            auth.user.organizationId,
            query.page?.toString(),
            query.pageSize?.toString(),
          );

      return context.json(createApiResponse(result.data, result.meta));
    },
  )
  .post(
    "/",
    requirePlatformAdmin(),
    zValidator("json", createOrganizationSchema),
    async (context) => {
      const body = context.req.valid("json");
      const organization = await runWithBypassTenantIsolation(() => createOrganization(body));
      return context.json(createApiResponse(organization), 201);
    },
  )
  .get(
    "/:organizationId",
    requireOrganizationReadAccess(),
    zValidator("param", organizationIdParamSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const organization = await getOrganizationById(organizationId);
      return context.json(createApiResponse(organization));
    },
  )
  .patch(
    "/:organizationId",
    requireOrganizationWriteAccess(),
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
    requireOrganizationWriteAccess(),
    zValidator("param", organizationIdParamSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      await softDeleteOrganization(organizationId);
      return context.body(null, 204);
    },
  );
