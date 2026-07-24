import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be lowercase alphanumeric with hyphens");

export const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[A-Z0-9_-]+$/, "Must be uppercase alphanumeric with _ or -");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
