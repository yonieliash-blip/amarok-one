import { z } from "zod";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";

export const attendanceParamsSchema = organizationIdParamSchema;

export const locationSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative().optional(),
  })
  .strict();

export const clockActionSchema = z
  .object({
    location: locationSchema.nullable().optional(),
  })
  .strict();

export type ClockActionInput = z.infer<typeof clockActionSchema>;
