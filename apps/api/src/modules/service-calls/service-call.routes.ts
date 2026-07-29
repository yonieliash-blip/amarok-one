import { isAssignedServiceCallsOnly } from "@amarok-one/permissions";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createApiResponse } from "@amarok-one/utils";
import { forbidden } from "../../lib/errors.js";
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
  assignTechnicianSchema,
  closeServiceCallSchema,
  finishVisitSchema,
  transitionLifecycleSchema,
  visitIdParamSchema,
} from "./service-call-lifecycle.schemas.js";
import type { ServiceCallService } from "./service-call.service.js";

function requireControlCenterWrite(context: Parameters<typeof getAuth>[0]): void {
  if (assignedOnly(context)) {
    throw forbidden("Insufficient permissions");
  }
}

function actorId(context: Parameters<typeof getAuth>[0]): string {
  return getAuth(context).user.sub;
}

function assignedOnly(context: Parameters<typeof getAuth>[0]): boolean {
  return isAssignedServiceCallsOnly(getAuth(context).user.permissions);
}

export function createServiceCallRoutes(serviceCallService: ServiceCallService): Hono {
  return new Hono()
    .use("*", tenantGuard)
    .get(
      "/assignees",
      requirePermission("service_calls:read"),
      zValidator("param", organizationIdParamSchema),
      async (context) => {
        const { organizationId } = context.req.valid("param");
        const assignees = await serviceCallService.listAssignableUsers(organizationId);
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
        const result = await serviceCallService.listServiceCalls(
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
        const serviceCall = await serviceCallService.createServiceCall(
          organizationId,
          body,
          actorId(context),
        );
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
          await serviceCallService.assertAssignedServiceCallAccess(
            organizationId,
            serviceCallId,
            actorId(context),
          );
        }
        const serviceCall = await serviceCallService.getServiceCallById(
          organizationId,
          serviceCallId,
        );
        return context.json(createApiResponse(serviceCall));
      },
    )
    .patch(
      "/:serviceCallId",
      requireAnyPermission("service_calls:write", "my_service_calls:write"),
      zValidator("param", serviceCallIdParamSchema),
      zValidator("json", updateServiceCallSchema),
      async (context) => {
        const { organizationId, serviceCallId } = context.req.valid("param");
        const body = context.req.valid("json");
        const technicianOnly = assignedOnly(context);
        if (technicianOnly) {
          await serviceCallService.assertAssignedServiceCallAccess(
            organizationId,
            serviceCallId,
            actorId(context),
          );
        } else {
          requireControlCenterWrite(context);
        }
        const serviceCall = await serviceCallService.updateServiceCall(
          organizationId,
          serviceCallId,
          body,
          actorId(context),
          { technicianFieldNotesOnly: technicianOnly },
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
        await serviceCallService.softDeleteServiceCall(
          organizationId,
          serviceCallId,
          actorId(context),
        );
        return context.body(null, 204);
      },
    )
    .get(
      "/:serviceCallId/lifecycle",
      requireAnyPermission("service_calls:read", "my_service_calls:read"),
      zValidator("param", serviceCallIdParamSchema),
      async (context) => {
        const { organizationId, serviceCallId } = context.req.valid("param");
        if (assignedOnly(context)) {
          await serviceCallService.assertAssignedServiceCallAccess(
            organizationId,
            serviceCallId,
            actorId(context),
          );
        }
        const view = await serviceCallService.getServiceCallLifecycle(
          organizationId,
          serviceCallId,
        );
        return context.json(createApiResponse(view));
      },
    )
    .post(
      "/:serviceCallId/lifecycle/assign",
      requirePermission("service_calls:assign"),
      zValidator("param", serviceCallIdParamSchema),
      zValidator("json", assignTechnicianSchema),
      async (context) => {
        const { organizationId, serviceCallId } = context.req.valid("param");
        const body = context.req.valid("json");
        const view = await serviceCallService.assignTechnician(
          organizationId,
          serviceCallId,
          body,
          actorId(context),
        );
        return context.json(createApiResponse(view));
      },
    )
    .post(
      "/:serviceCallId/lifecycle/transition",
      requirePermission("service_calls:assign"),
      zValidator("param", serviceCallIdParamSchema),
      zValidator("json", transitionLifecycleSchema),
      async (context) => {
        const { organizationId, serviceCallId } = context.req.valid("param");
        const body = context.req.valid("json");
        const view = await serviceCallService.transitionServiceCallLifecycle(
          organizationId,
          serviceCallId,
          body,
          actorId(context),
        );
        return context.json(createApiResponse(view));
      },
    )
    .post(
      "/:serviceCallId/lifecycle/close",
      requirePermission("service_calls:close"),
      zValidator("param", serviceCallIdParamSchema),
      zValidator("json", closeServiceCallSchema),
      async (context) => {
        const { organizationId, serviceCallId } = context.req.valid("param");
        const body = context.req.valid("json");
        const view = await serviceCallService.closeServiceCallLifecycle(
          organizationId,
          serviceCallId,
          actorId(context),
          body.reason,
        );
        return context.json(createApiResponse(view));
      },
    )
    .post(
      "/:serviceCallId/visits/:visitId/driving",
      requirePermission("my_service_calls:read"),
      zValidator("param", visitIdParamSchema),
      async (context) => {
        const { organizationId, serviceCallId, visitId } = context.req.valid("param");
        await serviceCallService.assertAssignedServiceCallAccess(
          organizationId,
          serviceCallId,
          actorId(context),
        );
        const view = await serviceCallService.startVisitDriving(
          organizationId,
          serviceCallId,
          visitId,
          actorId(context),
        );
        return context.json(createApiResponse(view));
      },
    )
    .post(
      "/:serviceCallId/visits/:visitId/working",
      requirePermission("my_service_calls:read"),
      zValidator("param", visitIdParamSchema),
      async (context) => {
        const { organizationId, serviceCallId, visitId } = context.req.valid("param");
        await serviceCallService.assertAssignedServiceCallAccess(
          organizationId,
          serviceCallId,
          actorId(context),
        );
        const view = await serviceCallService.startVisitWorking(
          organizationId,
          serviceCallId,
          visitId,
          actorId(context),
        );
        return context.json(createApiResponse(view));
      },
    )
    .post(
      "/:serviceCallId/visits/:visitId/finish",
      requirePermission("my_service_calls:read"),
      zValidator("param", visitIdParamSchema),
      zValidator("json", finishVisitSchema),
      async (context) => {
        const { organizationId, serviceCallId, visitId } = context.req.valid("param");
        await serviceCallService.assertAssignedServiceCallAccess(
          organizationId,
          serviceCallId,
          actorId(context),
        );
        const body = context.req.valid("json");
        const view = await serviceCallService.finishVisit(
          organizationId,
          serviceCallId,
          visitId,
          body,
          actorId(context),
        );
        return context.json(createApiResponse(view));
      },
    );
}
