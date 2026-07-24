import { z } from "zod";
import { codeSchema, paginationQuerySchema } from "../../lib/schemas.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";

export const customerStatusSchema = z.enum(["active", "inactive", "prospect"]);

export const customerIdParamSchema = organizationIdParamSchema.extend({
  customerId: z.string().uuid(),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(256),
  legalName: z.string().trim().min(2).max(256).optional(),
  registrationNumber: z.string().trim().min(2).max(64).optional(),
  customerNumber: codeSchema,
  email: z.string().trim().email().max(256).optional(),
  phone: z.string().trim().min(3).max(32).optional(),
  address: z.string().trim().min(2).max(256).optional(),
  city: z.string().trim().min(2).max(128).optional(),
  country: z.string().trim().min(2).max(128).optional(),
  notes: z.string().trim().max(2000).optional(),
  status: customerStatusSchema.optional(),
});

export const updateCustomerSchema = z
  .object({
    name: z.string().trim().min(2).max(256).optional(),
    legalName: z.string().trim().min(2).max(256).nullable().optional(),
    registrationNumber: z.string().trim().min(2).max(64).nullable().optional(),
    customerNumber: codeSchema.optional(),
    email: z.string().trim().email().max(256).nullable().optional(),
    phone: z.string().trim().min(3).max(32).nullable().optional(),
    address: z.string().trim().min(2).max(256).nullable().optional(),
    city: z.string().trim().min(2).max(128).nullable().optional(),
    country: z.string().trim().min(2).max(128).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    status: customerStatusSchema.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one field must be provided",
  });

export const listCustomersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(128).optional(),
  status: customerStatusSchema.optional(),
});

export const contactIdParamSchema = customerIdParamSchema.extend({
  contactId: z.string().uuid(),
});

export const createContactSchema = z.object({
  name: z.string().trim().min(2).max(128),
  email: z.string().trim().email().max(256).optional(),
  phone: z.string().trim().min(3).max(32).optional(),
  jobTitle: z.string().trim().min(2).max(128).optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateContactSchema = z
  .object({
    name: z.string().trim().min(2).max(128).optional(),
    email: z.string().trim().email().max(256).nullable().optional(),
    phone: z.string().trim().min(3).max(32).nullable().optional(),
    jobTitle: z.string().trim().min(2).max(128).nullable().optional(),
    isPrimary: z.boolean().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one field must be provided",
  });

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
