import { z } from "zod";
import { paginationQuerySchema, slugSchema } from "../../lib/schemas.js";

export const organizationIdParamSchema = z.object({
  organizationId: z.string().uuid(),
});

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(128),
  slug: slugSchema,
});

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(128).optional(),
    slug: slugSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.slug !== undefined, {
    message: "At least one field must be provided",
  });

export const listOrganizationsQuerySchema = paginationQuerySchema;

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
