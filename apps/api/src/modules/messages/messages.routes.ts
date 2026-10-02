import { createApiResponse } from "@amarok-one/utils";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getAuth } from "../../lib/auth-context.js";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import {
  conversationIdParamSchema,
  recipientMemberIdParamSchema,
  sendDirectMessageSchema,
} from "./messages.schemas.js";
import type { MessagesService } from "./messages.service.js";

export function createMessagesRoutes(messagesService: MessagesService): Hono {
  return new Hono()
    .use("*", tenantGuard)
    .get(
      "/members",
      requirePermission("messages:read"),
      zValidator("param", organizationIdParamSchema),
      async (context) => {
        const { organizationId } = context.req.valid("param");
        return context.json(
          createApiResponse(
            await messagesService.listRecipients(organizationId, getAuth(context).user.sub),
          ),
        );
      },
    )
    .get(
      "/conversations",
      requirePermission("messages:read"),
      zValidator("param", organizationIdParamSchema),
      async (context) => {
        const { organizationId } = context.req.valid("param");
        return context.json(
          createApiResponse(
            await messagesService.listConversations(organizationId, getAuth(context).user.sub),
          ),
        );
      },
    )
    .get(
      "/unread-count",
      requirePermission("messages:read"),
      zValidator("param", organizationIdParamSchema),
      async (context) => {
        const { organizationId } = context.req.valid("param");
        return context.json(
          createApiResponse(
            await messagesService.unreadCount(organizationId, getAuth(context).user.sub),
          ),
        );
      },
    )
    .get(
      "/conversations/:conversationId/messages",
      requirePermission("messages:read"),
      zValidator("param", conversationIdParamSchema),
      async (context) => {
        const { organizationId, conversationId } = context.req.valid("param");
        return context.json(
          createApiResponse(
            await messagesService.listMessages(
              organizationId,
              conversationId,
              getAuth(context).user.sub,
            ),
          ),
        );
      },
    )
    .post(
      "/conversations/:conversationId/read",
      requirePermission("messages:read"),
      zValidator("param", conversationIdParamSchema),
      async (context) => {
        const { organizationId, conversationId } = context.req.valid("param");
        return context.json(
          createApiResponse(
            await messagesService.markConversationRead(
              organizationId,
              conversationId,
              getAuth(context).user.sub,
            ),
          ),
        );
      },
    )
    .post(
      "/members/:memberId/messages",
      requirePermission("messages:write"),
      zValidator("param", recipientMemberIdParamSchema),
      zValidator("json", sendDirectMessageSchema),
      async (context) => {
        const { organizationId, memberId } = context.req.valid("param");
        return context.json(
          createApiResponse(
            await messagesService.sendMessageToMember(
              organizationId,
              memberId,
              getAuth(context).user.sub,
              context.req.valid("json"),
            ),
          ),
          201,
        );
      },
    );
}
