import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createApiResponse } from "@amarok-one/utils";
import { getAuth } from "../../lib/auth-context.js";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import {
  createEquipmentSchema,
  createEquipmentCatalogModelSchema,
  createEquipmentManufacturerSchema,
  createEquipmentTypeSchema,
  equipmentIdParamSchema,
  listEquipmentCatalogModelsQuerySchema,
  listEquipmentQuerySchema,
  updateEquipmentSchema,
} from "./equipment.schemas.js";
import {
  createEquipment,
  createEquipmentCatalogModel,
  createEquipmentManufacturer,
  createEquipmentType,
  getEquipmentById,
  listEquipment,
  listEquipmentCatalogModels,
  listEquipmentManufacturers,
  listEquipmentTypes,
  loadDefaultEquipmentCatalog,
  removeEquipmentFromFleet,
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
  .post(
    "/types",
    requirePermission("equipment:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createEquipmentTypeSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const equipmentType = await createEquipmentType(
        organizationId,
        context.req.valid("json"),
        actorId(context),
      );
      return context.json(createApiResponse(equipmentType), 201);
    },
  )
  .get(
    "/catalog/manufacturers",
    requirePermission("equipment:read"),
    zValidator("param", organizationIdParamSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      return context.json(createApiResponse(await listEquipmentManufacturers(organizationId)));
    },
  )
  .post(
    "/catalog/manufacturers",
    requirePermission("equipment:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createEquipmentManufacturerSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const manufacturer = await createEquipmentManufacturer(
        organizationId,
        context.req.valid("json"),
        actorId(context),
      );
      return context.json(createApiResponse(manufacturer), 201);
    },
  )
  .get(
    "/catalog/models",
    requirePermission("equipment:read"),
    zValidator("param", organizationIdParamSchema),
    zValidator("query", listEquipmentCatalogModelsQuerySchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const query = context.req.valid("query");
      const models = await listEquipmentCatalogModels(
        organizationId,
        query.equipmentManufacturerId,
        query.equipmentTypeId,
      );
      return context.json(createApiResponse(models));
    },
  )
  .post(
    "/catalog/models",
    requirePermission("equipment:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createEquipmentCatalogModelSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const model = await createEquipmentCatalogModel(
        organizationId,
        context.req.valid("json"),
        actorId(context),
      );
      return context.json(createApiResponse(model), 201);
    },
  )
  .post(
    "/catalog/defaults",
    requirePermission("equipment:write"),
    zValidator("param", organizationIdParamSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const result = await loadDefaultEquipmentCatalog(organizationId, actorId(context));
      return context.json(createApiResponse(result));
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
      const result = await removeEquipmentFromFleet(organizationId, equipmentId, actorId(context));
      return context.json(createApiResponse(result));
    },
  );
