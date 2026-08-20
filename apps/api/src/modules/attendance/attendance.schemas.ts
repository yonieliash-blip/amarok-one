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

export const workDayLocationsSchema = z
  .object({
    points: z
      .array(locationSchema.extend({ recordedAt: z.string().datetime() }).strict())
      .min(1)
      .max(100),
  })
  .strict();

export type WorkDayLocationsInput = z.infer<typeof workDayLocationsSchema>;

export const monthlyAttendanceQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must use YYYY-MM format"),
});

export const attendancePeriodParamsSchema = organizationIdParamSchema.extend({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must use YYYY-MM format"),
});

export const unlockAttendancePeriodSchema = z
  .object({ reason: z.string().trim().min(5).max(500) })
  .strict();

export type UnlockAttendancePeriodInput = z.infer<typeof unlockAttendancePeriodSchema>;

export const workDayParamsSchema = organizationIdParamSchema.extend({
  workDayId: z.string().uuid(),
});

export const correctWorkDaySchema = z
  .object({
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
    reason: z.string().trim().min(5).max(500),
  })
  .strict()
  .refine((value) => new Date(value.endedAt) > new Date(value.startedAt), {
    message: "endedAt must be after startedAt",
    path: ["endedAt"],
  });

export type CorrectWorkDayInput = z.infer<typeof correctWorkDaySchema>;
