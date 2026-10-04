import { createApiResponse } from "@amarok-one/utils";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getAuth } from "../../lib/auth-context.js";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import { z } from "zod";
import {
  appendDocumentVersionSchema,
  createDocumentCaseSchema,
  decideDocumentVersionSchema,
  documentCaseIdParamSchema,
  recordDeliverySchema,
  submitForReviewSchema,
} from "./document-case.schemas.js";
import {
  appendDocumentVersion,
  createDocumentCase,
  decideDocumentVersion,
  getDocumentCase,
  listDocumentCaseAssignees,
  listDocumentCases,
  recordDelivery,
  submitForReview,
} from "./document-case.service.js";

export const documentCaseRoutes = new Hono()
  .use("*", tenantGuard)
  .get(
    "/",
    requirePermission("document_cases:read"),
    zValidator("param", organizationIdParamSchema),
    async (context) =>
      context.json(
        createApiResponse(await listDocumentCases(context.req.valid("param").organizationId)),
      ),
  )
  .post(
    "/",
    requirePermission("document_cases:write"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createDocumentCaseSchema),
    async (context) =>
      context.json(
        createApiResponse(
          await createDocumentCase(
            context.req.valid("param").organizationId,
            getAuth(context).user.sub,
            context.req.valid("json"),
          ),
        ),
        201,
      ),
  )
  .get(
    "/assignees",
    requirePermission("document_cases:write"),
    zValidator("param", organizationIdParamSchema),
    async (context) =>
      context.json(
        createApiResponse(
          await listDocumentCaseAssignees(context.req.valid("param").organizationId),
        ),
      ),
  )
  .get(
    "/:documentCaseId",
    requirePermission("document_cases:read"),
    zValidator("param", documentCaseIdParamSchema),
    async (context) =>
      context.json(
        createApiResponse(
          await getDocumentCase(
            context.req.valid("param").organizationId,
            context.req.valid("param").documentCaseId,
          ),
        ),
      ),
  )
  .post(
    "/:documentCaseId/versions",
    requirePermission("document_cases:write"),
    zValidator("param", documentCaseIdParamSchema),
    zValidator("json", appendDocumentVersionSchema),
    async (context) =>
      context.json(
        createApiResponse(
          await appendDocumentVersion(
            context.req.valid("param").organizationId,
            context.req.valid("param").documentCaseId,
            getAuth(context).user.sub,
            context.req.valid("json"),
          ),
        ),
        201,
      ),
  )
  .post(
    "/:documentCaseId/review",
    requirePermission("document_cases:write"),
    zValidator("param", documentCaseIdParamSchema),
    zValidator("json", submitForReviewSchema),
    async (context) =>
      context.json(
        createApiResponse(
          await submitForReview(
            context.req.valid("param").organizationId,
            context.req.valid("param").documentCaseId,
            getAuth(context).user.sub,
            context.req.valid("json").documentVersionId,
          ),
        ),
      ),
  )
  .post(
    "/:documentCaseId/versions/:documentVersionId/decision",
    requirePermission("document_cases:approve"),
    zValidator("param", documentCaseIdParamSchema.extend({ documentVersionId: z.string().uuid() })),
    zValidator("json", decideDocumentVersionSchema),
    async (context) =>
      context.json(
        createApiResponse(
          await decideDocumentVersion(
            context.req.valid("param").organizationId,
            context.req.valid("param").documentCaseId,
            getAuth(context).user.sub,
            context.req.valid("param").documentVersionId,
            context.req.valid("json"),
          ),
        ),
      ),
  )
  .post(
    "/:documentCaseId/deliveries",
    requirePermission("document_cases:send"),
    zValidator("param", documentCaseIdParamSchema),
    zValidator("json", recordDeliverySchema),
    async (context) =>
      context.json(
        createApiResponse(
          await recordDelivery(
            context.req.valid("param").organizationId,
            context.req.valid("param").documentCaseId,
            getAuth(context).user.sub,
            context.req.valid("json"),
          ),
        ),
        201,
      ),
  );
