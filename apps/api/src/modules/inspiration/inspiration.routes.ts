import { createApiResponse } from "@amarok-one/utils";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getAuth } from "../../lib/auth-context.js";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import {
  createInspirationQuoteSchema,
  inspirationMemberIdParamSchema,
  inspirationQuoteIdParamSchema,
  updateEmployeeInspirationSchema,
  updateInspirationQuoteSchema,
  upsertEmployeeInspirationSchema,
} from "./inspiration.schemas.js";
import type { InspirationService } from "./inspiration.service.js";

export function createInspirationRoutes(inspirationService: InspirationService): Hono {
  return new Hono()
    .use("*", tenantGuard)
    .get(
      "/current",
      requirePermission("messages:read"),
      zValidator("param", organizationIdParamSchema),
      async (context) => {
        const { organizationId } = context.req.valid("param");
        return context.json(
          createApiResponse(
            await inspirationService.getCurrent(organizationId, getAuth(context).user.sub),
          ),
        );
      },
    )
    .get(
      "/employees",
      requirePermission("users:write"),
      zValidator("param", organizationIdParamSchema),
      async (context) => {
        const { organizationId } = context.req.valid("param");
        return context.json(
          createApiResponse(await inspirationService.listEmployees(organizationId)),
        );
      },
    )
    .get(
      "/quotes",
      requirePermission("users:write"),
      zValidator("param", organizationIdParamSchema),
      async (context) => {
        const { organizationId } = context.req.valid("param");
        return context.json(createApiResponse(await inspirationService.listQuotes(organizationId)));
      },
    )
    .post(
      "/quotes",
      requirePermission("users:write"),
      zValidator("param", organizationIdParamSchema),
      zValidator("json", createInspirationQuoteSchema),
      async (context) => {
        const { organizationId } = context.req.valid("param");
        return context.json(
          createApiResponse(
            await inspirationService.createQuote(
              organizationId,
              getAuth(context).user.sub,
              context.req.valid("json"),
            ),
          ),
          201,
        );
      },
    )
    .patch(
      "/quotes/:quoteId",
      requirePermission("users:write"),
      zValidator("param", inspirationQuoteIdParamSchema),
      zValidator("json", updateInspirationQuoteSchema),
      async (context) => {
        const { organizationId, quoteId } = context.req.valid("param");
        return context.json(
          createApiResponse(
            await inspirationService.updateQuote(
              organizationId,
              quoteId,
              getAuth(context).user.sub,
              context.req.valid("json"),
            ),
          ),
        );
      },
    )
    .get(
      "/employee-messages",
      requirePermission("users:write"),
      zValidator("param", organizationIdParamSchema),
      async (context) => {
        const { organizationId } = context.req.valid("param");
        return context.json(
          createApiResponse(await inspirationService.listEmployeeMessages(organizationId)),
        );
      },
    )
    .put(
      "/employees/:memberId/message",
      requirePermission("users:write"),
      zValidator("param", inspirationMemberIdParamSchema),
      zValidator("json", upsertEmployeeInspirationSchema),
      async (context) => {
        const { organizationId, memberId } = context.req.valid("param");
        return context.json(
          createApiResponse(
            await inspirationService.upsertEmployeeMessage(
              organizationId,
              memberId,
              getAuth(context).user.sub,
              context.req.valid("json"),
            ),
          ),
        );
      },
    )
    .patch(
      "/employees/:memberId/message",
      requirePermission("users:write"),
      zValidator("param", inspirationMemberIdParamSchema),
      zValidator("json", updateEmployeeInspirationSchema),
      async (context) => {
        const { organizationId, memberId } = context.req.valid("param");
        return context.json(
          createApiResponse(
            await inspirationService.updateEmployeeMessage(
              organizationId,
              memberId,
              getAuth(context).user.sub,
              context.req.valid("json"),
            ),
          ),
        );
      },
    );
}
