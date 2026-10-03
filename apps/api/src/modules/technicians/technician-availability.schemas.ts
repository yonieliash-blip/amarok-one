import { z } from "zod";

function isValidLocalDate(value: string): boolean {
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must use YYYY-MM-DD")
  .refine(isValidLocalDate, {
    message: "date must be a valid calendar date",
  });

export const availabilityRangeQuerySchema = z
  .object({
    from: localDateSchema,
    to: localDateSchema,
  })
  .refine((value) => value.from <= value.to, {
    message: "from must be on or before to",
    path: ["to"],
  })
  .refine(
    (value) => {
      const from = new Date(`${value.from}T00:00:00.000Z`);
      const to = new Date(`${value.to}T00:00:00.000Z`);
      return to.valueOf() - from.valueOf() <= 31 * 24 * 60 * 60 * 1000;
    },
    { message: "availability range cannot exceed 31 days" },
  );

export const updateTechnicianAvailabilitySchema = z.object({
  status: z.enum(["available", "unavailable"]),
  note: z.string().trim().max(500).nullable().optional(),
});

export type AvailabilityRangeQuery = z.infer<typeof availabilityRangeQuerySchema>;
export type UpdateTechnicianAvailabilityInput = z.infer<typeof updateTechnicianAvailabilitySchema>;
