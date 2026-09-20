import { z } from "zod";
import { codeSchema, paginationQuerySchema } from "../../lib/schemas.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";

export const equipmentStatusSchema = z.enum(["active", "in_service", "out_of_service", "retired"]);

export const equipmentIdParamSchema = organizationIdParamSchema.extend({
  equipmentId: z.string().uuid(),
});

export const catalogManufacturerIdParamSchema = organizationIdParamSchema.extend({
  manufacturerId: z.string().uuid(),
});

export const catalogModelIdParamSchema = organizationIdParamSchema.extend({
  modelId: z.string().uuid(),
});

export const createEquipmentTypeSchema = z.object({
  name: z.string().trim().min(2).max(128),
  description: z.string().trim().max(500).optional(),
});

export const createEquipmentManufacturerSchema = z.object({
  name: z.string().trim().min(2).max(128),
});

export const createEquipmentCatalogModelSchema = z.object({
  name: z.string().trim().min(1).max(128),
  equipmentManufacturerId: z.string().uuid(),
  equipmentTypeId: z.string().uuid(),
});

export const listEquipmentCatalogModelsQuerySchema = z.object({
  equipmentManufacturerId: z.string().uuid().optional(),
  equipmentTypeId: z.string().uuid().optional(),
});

export const createEquipmentSchema = z.object({
  name: z.string().trim().min(2).max(256),
  internalNumber: codeSchema,
  serialNumber: z.string().trim().min(2).max(128).optional(),
  manufacturer: z.string().trim().min(2).max(128).optional(),
  model: z.string().trim().min(1).max(128).optional(),
  manufacturerId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  equipmentTypeId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  customerSiteId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: equipmentStatusSchema.optional(),
  engineHours: z.coerce.number().min(0).max(9999999.99).optional(),
  mileage: z.coerce.number().int().min(0).max(99999999).optional(),
  registrationNumber: z.string().trim().min(2).max(64).optional(),
  warrantyEndDate: z.string().date().optional(),
  location: z.string().trim().min(2).max(256).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateEquipmentSchema = z
  .object({
    name: z.string().trim().min(2).max(256).optional(),
    internalNumber: codeSchema.optional(),
    serialNumber: z.string().trim().min(2).max(128).nullable().optional(),
    manufacturer: z.string().trim().min(2).max(128).nullable().optional(),
    model: z.string().trim().min(1).max(128).nullable().optional(),
    manufacturerId: z.string().uuid().nullable().optional(),
    modelId: z.string().uuid().nullable().optional(),
    year: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
    equipmentTypeId: z.string().uuid().optional(),
    customerId: z.string().uuid().nullable().optional(),
    customerSiteId: z.string().uuid().nullable().optional(),
    branchId: z.string().uuid().nullable().optional(),
    status: equipmentStatusSchema.optional(),
    engineHours: z.coerce.number().min(0).max(9999999.99).nullable().optional(),
    mileage: z.coerce.number().int().min(0).max(99999999).nullable().optional(),
    registrationNumber: z.string().trim().min(2).max(64).nullable().optional(),
    warrantyEndDate: z.string().date().nullable().optional(),
    location: z.string().trim().min(2).max(256).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one field must be provided",
  });

export const listEquipmentQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(128).optional(),
  customerId: z.string().uuid().optional(),
  manufacturer: z.string().trim().max(128).optional(),
  model: z.string().trim().max(128).optional(),
  equipmentTypeId: z.string().uuid().optional(),
  status: equipmentStatusSchema.optional(),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
export type CreateEquipmentTypeInput = z.infer<typeof createEquipmentTypeSchema>;
export type CreateEquipmentManufacturerInput = z.infer<typeof createEquipmentManufacturerSchema>;
export type CreateEquipmentCatalogModelInput = z.infer<typeof createEquipmentCatalogModelSchema>;
