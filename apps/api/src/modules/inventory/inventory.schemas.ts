import { z } from "zod";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";

export const inventoryLocationTypeSchema = z.enum(["service_van", "central_warehouse"]);

export const createInventoryLocationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: inventoryLocationTypeSchema,
});

export const addInventoryItemSchema = z.object({
  locationId: z.string().uuid(),
  partId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const inventoryLocationIdParamSchema = organizationIdParamSchema.extend({
  locationId: z.string().uuid(),
});

export type CreateInventoryLocationInput = z.infer<typeof createInventoryLocationSchema>;
export type AddInventoryItemInput = z.infer<typeof addInventoryItemSchema>;
