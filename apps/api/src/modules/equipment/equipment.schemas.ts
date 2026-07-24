import { z } from "zod";
import { codeSchema, paginationQuerySchema } from "../../lib/schemas.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";

export const equipmentStatusSchema = z.enum(["active", "in_service", "out_of_service", "retired"]);

export const equipmentIdParamSchema = organizationIdParamSchema.extend({
  equipmentId: z.string().uuid(),
});

export const createEquipmentSchema = z.object({
  name: z.string().trim().min(2).max(256),
  internalNumber: codeSchema,
  serialNumber: z.string().trim().min(2).max(128).optional(),
  manufacturer: z.string().trim().min(2).max(128).optional(),
  model: z.string().trim().min(1).max(128).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  equipmentTypeId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
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
    year: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
    equipmentTypeId: z.string().uuid().optional(),
    customerId: z.string().uuid().nullable().optional(),
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
