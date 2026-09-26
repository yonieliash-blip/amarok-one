import { createApiResponse } from "@amarok-one/utils";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getAuth } from "../../lib/auth-context.js";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import { addInventoryItemSchema, createInventoryLocationSchema } from "./inventory.schemas.js";
import {
  addInventoryItem,
  createInventoryLocation,
  listInventoryOverview,
} from "./inventory.service.js";

export const inventoryRoutes = new Hono()
  .use("*", tenantGuard)
  .get(
    "/",
    requirePermission("inventory:read"),
    zValidator("param", organizationIdParamSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      return context.json(createApiResponse(await listInventoryOverview(organizationId)));
    },
  )
  .post(
    "/locations",
    requirePermission("inventory:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createInventoryLocationSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const body = context.req.valid("json");
      return context.json(
        createApiResponse(
          await createInventoryLocation(organizationId, body, getAuth(context).user.sub),
        ),
        201,
      );
    },
  )
  .post(
    "/items",
    requirePermission("inventory:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", addInventoryItemSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const body = context.req.valid("json");
      return context.json(
        createApiResponse(await addInventoryItem(organizationId, body, getAuth(context).user.sub)),
        201,
      );
    },
  );
