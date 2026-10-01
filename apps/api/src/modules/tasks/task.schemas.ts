import { z } from "zod";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";

const taskStatusSchema = z.enum(["open", "in_progress", "waiting", "completed"]);
const taskPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

export const taskIdParamSchema = organizationIdParamSchema.extend({
  taskId: z.string().uuid(),
});

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  assignedToId: z.string().uuid().optional(),
  dueOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(4000).optional(),
  assignedToId: z.string().uuid(),
  priority: taskPrioritySchema.default("normal"),
  dueAt: z.string().datetime().optional(),
  linkUrl: z.string().url().max(2000).optional(),
  linkedEntityType: z.string().trim().min(2).max(80).optional(),
  linkedEntityId: z.string().uuid().optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(2).max(180).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    assignedToId: z.string().uuid().optional(),
    priority: taskPrioritySchema.optional(),
    dueAt: z.string().datetime().nullable().optional(),
    status: taskStatusSchema.optional(),
    completionNote: z.string().trim().max(2000).nullable().optional(),
    linkUrl: z.string().url().max(2000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
