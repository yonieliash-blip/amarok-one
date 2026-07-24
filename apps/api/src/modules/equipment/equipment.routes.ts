import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createApiResponse } from "@amarok-one/utils";
import { getAuth } from "../../lib/auth-context.js";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import {
  createEquipmentSchema,
  equipmentIdParamSchema,
  listEquipmentQuerySchema,
  updateEquipmentSchema,
} from "./equipment.schemas.js";
import {
  createEquipment,
  getEquipmentById,
  listEquipment,
  listEquipmentTypes,
  softDeleteEquipment,
  updateEquipment,
} from "./equipment.service.js";

function actorId(context: Parameters<typeof getAuth>[0]): string {
  return getAuth(context).user.sub;
}

export const equipmentRoutes = new Hono()
  .use("*", tenantGuard)
  .get(
    "/types",
    requirePermission("equipment:read"),
    zValidator("param", organizationIdParamSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const types = await listEquipmentTypes(organizationId);
      return context.json(createApiResponse(types));
    },
  )
  .get(
    "/",
    requirePermission("equipment:read"),
    zValidator("param", organizationIdParamSchema),
    zValidator("query", listEquipmentQuerySchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const query = context.req.valid("query");
      const result = await listEquipment(
        organizationId,
        query.page?.toString(),
        query.pageSize?.toString(),
        query.search,
        query.customerId,
        query.manufacturer,
        query.model,
        query.equipmentTypeId,
        query.status,
      );
      return context.json(createApiResponse(result.data, result.meta));
    },
  )
  .post(
    "/",
    requirePermission("equipment:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createEquipmentSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const body = context.req.valid("json");
      const equipment = await createEquipment(organizationId, body, actorId(context));
      return context.json(createApiResponse(equipment), 201);
    },
  )
  .get(
    "/:equipmentId",
    requirePermission("equipment:read"),
    zValidator("param", equipmentIdParamSchema),
    async (context) => {
      const { organizationId, equipmentId } = context.req.valid("param");
      const equipment = await getEquipmentById(organizationId, equipmentId);
      return context.json(createApiResponse(equipment));
    },
  )
  .patch(
    "/:equipmentId",
    requirePermission("equipment:write"),
    zValidator("param", equipmentIdParamSchema),
    zValidator("json", updateEquipmentSchema),
    async (context) => {
      const { organizationId, equipmentId } = context.req.valid("param");
      const body = context.req.valid("json");
      const equipment = await updateEquipment(organizationId, equipmentId, body, actorId(context));
      return context.json(createApiResponse(equipment));
    },
  )
  .delete(
    "/:equipmentId",
    requirePermission("equipment:write"),
    zValidator("param", equipmentIdParamSchema),
    async (context) => {
      const { organizationId, equipmentId } = context.req.valid("param");
      await softDeleteEquipment(organizationId, equipmentId, actorId(context));
      return context.body(null, 204);
    },
  );
