import { isAssignedServiceCallsOnly } from "@amarok-one/permissions";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createApiResponse } from "@amarok-one/utils";
import { getAuth } from "../../lib/auth-context.js";
import {
  requireAllPermissions,
  requireAnyPermission,
  requirePermission,
} from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import {
  createServiceCallSchema,
  listServiceCallsQuerySchema,
  serviceCallIdParamSchema,
  updateServiceCallSchema,
} from "./service-call.schemas.js";
import {
  assertAssignedServiceCallAccess,
  createServiceCall,
  getServiceCallById,
  listAssignableUsers,
  listServiceCalls,
  softDeleteServiceCall,
  updateServiceCall,
} from "./service-call.service.js";

function actorId(context: Parameters<typeof getAuth>[0]): string {
  return getAuth(context).user.sub;
}

function assignedOnly(context: Parameters<typeof getAuth>[0]): boolean {
  return isAssignedServiceCallsOnly(getAuth(context).user.permissions);
}

export const serviceCallRoutes = new Hono()
  .use("*", tenantGuard)
  .get(
    "/assignees",
    requirePermission("service_calls:read"),
    zValidator("param", organizationIdParamSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const assignees = await listAssignableUsers(organizationId);
      return context.json(createApiResponse(assignees));
    },
  )
  .get(
    "/",
    requireAnyPermission("service_calls:read", "my_service_calls:read"),
    zValidator("param", organizationIdParamSchema),
    zValidator("query", listServiceCallsQuerySchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const query = context.req.valid("query");
      const scopedToActor = assignedOnly(context);
      const result = await listServiceCalls(
        organizationId,
        query.page?.toString(),
        query.pageSize?.toString(),
        query.search,
        query.status,
        query.priority,
        query.customerId,
        query.equipmentId,
        scopedToActor ? actorId(context) : query.assignedUserId,
        query.openedFrom,
        query.openedTo,
      );
      return context.json(createApiResponse(result.data, result.meta));
    },
  )
  .post(
    "/",
    requireAllPermissions("service_calls:read", "service_calls:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createServiceCallSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const body = context.req.valid("json");
      const serviceCall = await createServiceCall(organizationId, body, actorId(context));
      return context.json(createApiResponse(serviceCall), 201);
    },
  )
  .get(
    "/:serviceCallId",
    requireAnyPermission("service_calls:read", "my_service_calls:read"),
    zValidator("param", serviceCallIdParamSchema),
    async (context) => {
      const { organizationId, serviceCallId } = context.req.valid("param");
      if (assignedOnly(context)) {
        await assertAssignedServiceCallAccess(organizationId, serviceCallId, actorId(context));
      }
      const serviceCall = await getServiceCallById(organizationId, serviceCallId);
      return context.json(createApiResponse(serviceCall));
    },
  )
  .patch(
    "/:serviceCallId",
    requirePermission("service_calls:write"),
    zValidator("param", serviceCallIdParamSchema),
    zValidator("json", updateServiceCallSchema),
    async (context) => {
      const { organizationId, serviceCallId } = context.req.valid("param");
      const body = context.req.valid("json");
      if (assignedOnly(context)) {
        await assertAssignedServiceCallAccess(organizationId, serviceCallId, actorId(context));
      }
      const serviceCall = await updateServiceCall(
        organizationId,
        serviceCallId,
        body,
        actorId(context),
      );
      return context.json(createApiResponse(serviceCall));
    },
  )
  .delete(
    "/:serviceCallId",
    requireAllPermissions("service_calls:read", "service_calls:write"),
    zValidator("param", serviceCallIdParamSchema),
    async (context) => {
      const { organizationId, serviceCallId } = context.req.valid("param");
      await softDeleteServiceCall(organizationId, serviceCallId, actorId(context));
      return context.body(null, 204);
    },
  );
