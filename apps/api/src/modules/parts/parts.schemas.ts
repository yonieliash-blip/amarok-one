import { z } from "zod";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";

export const createPartCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const createPartSubcategorySchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
});

export const createCatalogPartSchema = z.object({
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  partNumber: z.string().trim().min(1).max(80).optional(),
});

export const partCategoryIdParamSchema = organizationIdParamSchema.extend({
  categoryId: z.string().uuid(),
});

export type CreatePartCategoryInput = z.infer<typeof createPartCategorySchema>;
export type CreatePartSubcategoryInput = z.infer<typeof createPartSubcategorySchema>;
export type CreateCatalogPartInput = z.infer<typeof createCatalogPartSchema>;
