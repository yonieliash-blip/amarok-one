import { z } from "zod";
import { codeSchema, paginationQuerySchema } from "../../lib/schemas.js";
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

export const createServiceCallSchema = z.object({
  serviceCallNumber: codeSchema,
  title: z.string().trim().min(2).max(256),
  description: z.string().trim().max(4000).optional(),
  status: serviceCallStatusSchema.optional(),
  priority: serviceCallPrioritySchema.optional(),
  openedAt: dateTimeSchema.optional(),
  scheduledAt: dateTimeSchema.optional(),
  completedAt: dateTimeSchema.optional(),
  customerId: z.string().uuid(),
  equipmentId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  assignedUserId: z.string().uuid().optional(),
  contactName: z.string().trim().min(2).max(128).optional(),
  contactPhone: z.string().trim().min(3).max(32).optional(),
  location: z.string().trim().min(2).max(256).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateServiceCallSchema = z
  .object({
    serviceCallNumber: codeSchema.optional(),
    title: z.string().trim().min(2).max(256).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    status: serviceCallStatusSchema.optional(),
    priority: serviceCallPrioritySchema.optional(),
    openedAt: dateTimeSchema.optional(),
    scheduledAt: dateTimeSchema.nullable().optional(),
    completedAt: dateTimeSchema.nullable().optional(),
    customerId: z.string().uuid().optional(),
    equipmentId: z.string().uuid().optional(),
    branchId: z.string().uuid().nullable().optional(),
    assignedUserId: z.string().uuid().nullable().optional(),
    contactName: z.string().trim().min(2).max(128).nullable().optional(),
    contactPhone: z.string().trim().min(3).max(32).nullable().optional(),
    location: z.string().trim().min(2).max(256).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
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

export type CreateServiceCallInput = z.infer<typeof createServiceCallSchema>;
export type UpdateServiceCallInput = z.infer<typeof updateServiceCallSchema>;
