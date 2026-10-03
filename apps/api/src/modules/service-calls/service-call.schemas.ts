import { z } from "zod";
import { paginationQuerySchema } from "../../lib/schemas.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";

export const serviceCallStatusSchema = z.enum([
  "open",
  "scheduled",
  "in_progress",
  "waiting_for_parts",
  "completed",
  "cancelled",
]);

export const serviceCallPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

export const serviceCallIdParamSchema = organizationIdParamSchema.extend({
  serviceCallId: z.string().uuid(),
});

const dateTimeSchema = z.string().datetime({ offset: true }).or(z.string().date());

export const createServiceCallSchema = z
  .object({
    title: z.string().trim().min(2).max(256),
    description: z.string().trim().max(4000).optional(),
    status: serviceCallStatusSchema.optional(),
    priority: serviceCallPrioritySchema.optional(),
    openedAt: dateTimeSchema.optional(),
    scheduledAt: dateTimeSchema.optional(),
    completedAt: dateTimeSchema.optional(),
    customerId: z.string().uuid(),
    customerSiteId: z.string().uuid().optional(),
    equipmentId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    assignedUserId: z.string().uuid().optional(),
    contactName: z.string().trim().min(2).max(128).optional(),
    contactPhone: z.string().trim().min(3).max(32).optional(),
    location: z.string().trim().min(2).max(256).optional(),
    equipmentModel: z.string().trim().min(2).max(128).optional(),
    equipmentLicensePlate: z.string().trim().min(2).max(64).optional(),
    equipmentChassisNumber: z.string().trim().min(3).max(64).optional(),
    purchaseOrderNumber: z.string().trim().min(1).max(128).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict()
  .refine((value) => value.equipmentId || value.equipmentModel, {
    message: "An existing equipment item or a one-off equipment model is required",
    path: ["equipmentModel"],
  });

export const updateServiceCallSchema = z
  .object({
    title: z.string().trim().min(2).max(256).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    status: serviceCallStatusSchema.optional(),
    priority: serviceCallPrioritySchema.optional(),
    openedAt: dateTimeSchema.optional(),
    scheduledAt: dateTimeSchema.nullable().optional(),
    completedAt: dateTimeSchema.nullable().optional(),
    customerId: z.string().uuid().optional(),
    customerSiteId: z.string().uuid().nullable().optional(),
    equipmentId: z.string().uuid().nullable().optional(),
    branchId: z.string().uuid().nullable().optional(),
    assignedUserId: z.string().uuid().nullable().optional(),
    contactName: z.string().trim().min(2).max(128).nullable().optional(),
    contactPhone: z.string().trim().min(3).max(32).nullable().optional(),
    location: z.string().trim().min(2).max(256).nullable().optional(),
    equipmentModel: z.string().trim().min(2).max(128).nullable().optional(),
    equipmentLicensePlate: z.string().trim().min(2).max(64).nullable().optional(),
    equipmentChassisNumber: z.string().trim().min(3).max(64).nullable().optional(),
    purchaseOrderNumber: z.string().trim().min(1).max(128).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one field must be provided",
  });

export const listServiceCallsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(128).optional(),
  status: serviceCallStatusSchema.optional(),
  priority: serviceCallPrioritySchema.optional(),
  customerId: z.string().uuid().optional(),
  equipmentId: z.string().uuid().optional(),
  assignedUserId: z.string().uuid().optional(),
  openedFrom: dateTimeSchema.optional(),
  openedTo: dateTimeSchema.optional(),
});

export const dispatchBoardQuerySchema = z
  .object({
    scheduledFrom: z.string().datetime({ offset: true }),
    scheduledTo: z.string().datetime({ offset: true }),
  })
  .refine((value) => new Date(value.scheduledFrom) < new Date(value.scheduledTo), {
    message: "scheduledFrom must be before scheduledTo",
    path: ["scheduledTo"],
  });

export const myScheduleQuerySchema = dispatchBoardQuerySchema;

export type CreateServiceCallInput = z.infer<typeof createServiceCallSchema>;
export type UpdateServiceCallInput = z.infer<typeof updateServiceCallSchema>;
