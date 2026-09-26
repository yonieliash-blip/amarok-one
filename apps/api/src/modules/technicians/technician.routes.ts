import { zValidator } from "@hono/zod-validator";
import { createApiResponse } from "@amarok-one/utils";
import { Hono } from "hono";
import { z } from "zod";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { getAuth } from "../../lib/auth-context.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import { assignTechnicianServiceVan, listTechnicians } from "./technician.service.js";

const technicianIdParamSchema = organizationIdParamSchema.extend({
  technicianId: z.string().uuid(),
});

const assignServiceVanSchema = z.object({
  inventoryLocationId: z.string().uuid().nullable(),
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
