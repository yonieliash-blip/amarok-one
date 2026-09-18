import { zValidator } from "@hono/zod-validator";
import { createApiResponse } from "@amarok-one/utils";
import { Hono } from "hono";
import { getAuth } from "../../lib/auth-context.js";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import { createTechnicianSchema } from "./technician.schemas.js";
import { createTechnician, listTechnicians } from "./technician.service.js";

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
  .post(
    "/",
    requirePermission("technicians:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createTechnicianSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const auth = getAuth(context);
      const technician = await createTechnician(
        organizationId,
        auth.user.sub,
        context.req.valid("json"),
      );
      return context.json(createApiResponse(technician), 201);
    },
  );
