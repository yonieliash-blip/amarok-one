import { z } from "zod";
import { codeSchema, paginationQuerySchema } from "../../lib/schemas.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";

export const companyIdParamSchema = organizationIdParamSchema.extend({
  companyId: z.string().uuid(),
});

export const createCompanySchema = z.object({
  name: z.string().trim().min(2).max(128),
  code: codeSchema,
  legalName: z.string().trim().min(2).max(256).optional(),
  taxId: z.string().trim().min(2).max(64).optional(),
});

export const updateCompanySchema = z
  .object({
    name: z.string().trim().min(2).max(128).optional(),
    code: codeSchema.optional(),
    legalName: z.string().trim().min(2).max(256).nullable().optional(),
    taxId: z.string().trim().min(2).max(64).nullable().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.code !== undefined ||
      value.legalName !== undefined ||
      value.taxId !== undefined,
    { message: "At least one field must be provided" },
  );

export const listCompaniesQuerySchema = paginationQuerySchema;

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
