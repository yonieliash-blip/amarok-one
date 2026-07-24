import { z } from "zod";
import { codeSchema, paginationQuerySchema } from "../../lib/schemas.js";
import { companyIdParamSchema } from "../companies/company.schemas.js";

export const branchIdParamSchema = companyIdParamSchema.extend({
  branchId: z.string().uuid(),
});

export const createBranchSchema = z.object({
  name: z.string().trim().min(2).max(128),
  code: codeSchema,
  addressLine1: z.string().trim().min(2).max(256).optional(),
  city: z.string().trim().min(2).max(128).optional(),
  country: z.string().trim().min(2).max(128).optional(),
});

export const updateBranchSchema = z
  .object({
    name: z.string().trim().min(2).max(128).optional(),
    code: codeSchema.optional(),
    addressLine1: z.string().trim().min(2).max(256).nullable().optional(),
    city: z.string().trim().min(2).max(128).nullable().optional(),
    country: z.string().trim().min(2).max(128).nullable().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.code !== undefined ||
      value.addressLine1 !== undefined ||
      value.city !== undefined ||
      value.country !== undefined,
    { message: "At least one field must be provided" },
  );

export const listBranchesQuerySchema = paginationQuerySchema;

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
