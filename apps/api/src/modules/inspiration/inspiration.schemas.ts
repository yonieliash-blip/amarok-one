import { z } from "zod";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";

export const inspirationQuoteIdParamSchema = organizationIdParamSchema.extend({
  quoteId: z.string().uuid(),
});

export const inspirationMemberIdParamSchema = organizationIdParamSchema.extend({
  memberId: z.string().uuid(),
});

export const createInspirationQuoteSchema = z
  .object({
    text: z.string().trim().min(2).max(1000),
    author: z.string().trim().min(2).max(128).optional(),
  })
  .strict();

export const updateInspirationQuoteSchema = z
  .object({
    text: z.string().trim().min(2).max(1000).optional(),
    author: z.string().trim().min(2).max(128).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one field must be provided",
  });

export const upsertEmployeeInspirationSchema = z
  .object({
    text: z.string().trim().min(2).max(1000),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateEmployeeInspirationSchema = z.object({ isActive: z.boolean() }).strict();

export type CreateInspirationQuoteInput = z.infer<typeof createInspirationQuoteSchema>;
export type UpdateInspirationQuoteInput = z.infer<typeof updateInspirationQuoteSchema>;
export type UpsertEmployeeInspirationInput = z.infer<typeof upsertEmployeeInspirationSchema>;
export type UpdateEmployeeInspirationInput = z.infer<typeof updateEmployeeInspirationSchema>;
