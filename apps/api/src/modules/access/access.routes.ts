import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createApiResponse } from "@amarok-one/utils";
import { getAuth } from "../../lib/auth-context.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import type { AccessService } from "./access.service.js";
import { memberIdParamSchema, updateMemberModuleAccessSchema } from "./access.schemas.js";

export function createAccessRoutes(accessService: AccessService): Hono {
  return new Hono()
    .use("*", tenantGuard)
    .get(
      "/members",
      requirePermission("users:read"),
      zValidator("param", organizationIdParamSchema),
      async (context) => {
        const { organizationId } = context.req.valid("param");
        const members = await accessService.listMembers(organizationId);
        return context.json(createApiResponse(members));
      },
    )
    .get(
      "/members/:memberId",
      requirePermission("users:read"),
      zValidator("param", memberIdParamSchema),
      async (context) => {
        const { organizationId, memberId } = context.req.valid("param");
        const member = await accessService.getMemberAccess(organizationId, memberId);
        return context.json(createApiResponse(member));
      },
    )
    .patch(
      "/members/:memberId/modules",
      requirePermission("users:write"),
      zValidator("param", memberIdParamSchema),
      zValidator("json", updateMemberModuleAccessSchema),
      async (context) => {
        const { organizationId, memberId } = context.req.valid("param");
        const body = context.req.valid("json");
        const auth = getAuth(context);
        const result = await accessService.updateMemberModuleAccess(
          organizationId,
          memberId,
          auth.user.sub,
          body,
        );
        return context.json(createApiResponse(result));
      },
    );
}
