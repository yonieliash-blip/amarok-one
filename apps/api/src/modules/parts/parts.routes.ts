import { createApiResponse } from "@amarok-one/utils";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { getAuth } from "../../lib/auth-context.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import {
  createCatalogPartSchema,
  createPartCategorySchema,
  createPartSubcategorySchema,
} from "./parts.schemas.js";
import {
  createCatalogPart,
  createPartCategory,
  createPartSubcategory,
  listPartsCatalog,
} from "./parts.service.js";

export const partsRoutes = new Hono()
  .use("*", tenantGuard)
  .get(
    "/",
    requirePermission("parts:read"),
    zValidator("param", organizationIdParamSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      return context.json(createApiResponse(await listPartsCatalog(organizationId)));
    },
  )
  .post(
    "/categories",
    requirePermission("parts:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createPartCategorySchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const body = context.req.valid("json");
      return context.json(
        createApiResponse(
          await createPartCategory(organizationId, body, getAuth(context).user.sub),
        ),
        201,
      );
    },
  )
  .post(
    "/subcategories",
    requirePermission("parts:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createPartSubcategorySchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const body = context.req.valid("json");
      return context.json(
        createApiResponse(
          await createPartSubcategory(organizationId, body, getAuth(context).user.sub),
        ),
        201,
      );
    },
  )
  .post(
    "/catalog-parts",
    requirePermission("parts:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createCatalogPartSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const body = context.req.valid("json");
      return context.json(
        createApiResponse(await createCatalogPart(organizationId, body, getAuth(context).user.sub)),
        201,
      );
    },
  );
