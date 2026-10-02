import { z } from "zod";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";

export const conversationIdParamSchema = organizationIdParamSchema.extend({
  conversationId: z.string().uuid(),
});

export const recipientMemberIdParamSchema = organizationIdParamSchema.extend({
  memberId: z.string().uuid(),
});

export const sendDirectMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export type SendDirectMessageInput = z.infer<typeof sendDirectMessageSchema>;
