import { zValidator } from "@hono/zod-validator";
import { createApiResponse } from "@amarok-one/utils";
import { Hono } from "hono";
import { z } from "zod";
import { requireAllPermissions, requirePermission } from "../../middleware/jwt-guard.js";
import { getAuth } from "../../lib/auth-context.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import { assignTechnicianServiceVan, listTechnicians } from "./technician.service.js";
import {
  availabilityRangeQuerySchema,
  localDateSchema,
  updateTechnicianAvailabilitySchema,
} from "./technician-availability.schemas.js";
import {
  listMyTechnicianAvailability,
  listTechnicianAvailability,
  setTechnicianAvailability,
} from "./technician-availability.service.js";

const technicianIdParamSchema = organizationIdParamSchema.extend({
  technicianId: z.string().uuid(),
});

const assignServiceVanSchema = z.object({
  inventoryLocationId: z.string().uuid().nullable(),
});

const technicianAvailabilityParamSchema = technicianIdParamSchema.extend({
  date: localDateSchema,
});

export const technicianRoutes = new Hono()
  .use("*", tenantGuard)
  .get(
    "/",
    requirePermission("technicians:read"),
    zValidator("param", organizationIdParamSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      return context.json(createApiResponse(await listTechnicians(organizationId)));
    },
  )
  .get(
    "/availability",
    requireAllPermissions("calendar:read", "technicians:read"),
    zValidator("param", organizationIdParamSchema),
    zValidator("query", availabilityRangeQuerySchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      return context.json(
        createApiResponse(
          await listTechnicianAvailability(organizationId, context.req.valid("query")),
        ),
      );
    },
  )
  .get(
    "/me/availability",
    requirePermission("my_schedule:read"),
    zValidator("param", organizationIdParamSchema),
    zValidator("query", availabilityRangeQuerySchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      return context.json(
        createApiResponse(
          await listMyTechnicianAvailability(
            organizationId,
            getAuth(context).user.sub,
            context.req.valid("query"),
          ),
        ),
      );
    },
  )
  .put(
    "/:technicianId/availability/:date",
    requirePermission("service_calls:assign"),
    zValidator("param", technicianAvailabilityParamSchema),
    zValidator("json", updateTechnicianAvailabilitySchema),
    async (context) => {
      const { organizationId, technicianId, date } = context.req.valid("param");
      return context.json(
        createApiResponse(
          await setTechnicianAvailability(
            organizationId,
            technicianId,
            date,
            context.req.valid("json"),
            getAuth(context).user.sub,
          ),
        ),
      );
    },
  )
  .patch(
    "/:technicianId/assigned-van",
    requirePermission("technicians:write"),
    zValidator("param", technicianIdParamSchema),
    zValidator("json", assignServiceVanSchema),
    async (context) => {
      const { organizationId, technicianId } = context.req.valid("param");
      const body = context.req.valid("json");
      return context.json(
        createApiResponse(
          await assignTechnicianServiceVan(
            organizationId,
            technicianId,
            body.inventoryLocationId,
            getAuth(context).user.sub,
          ),
        ),
      );
    },
  );
