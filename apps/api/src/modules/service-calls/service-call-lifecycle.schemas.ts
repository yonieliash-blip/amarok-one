import { z } from "zod";

const lifecycleStateSchema = z.enum([
  "new",
  "waiting_assignment",
  "assigned",
  "driving",
  "working",
  "waiting_for_parts",
  "waiting_customer",
  "waiting_specialist",
  "waiting_manager_closure",
  "closed",
]);

export const assignTechnicianSchema = z.object({
  technicianId: z.string().uuid(),
  sequence: z.number().int().positive().optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  notes: z.string().max(4000).optional(),
});

export const transitionLifecycleSchema = z.object({
  toLifecycleState: lifecycleStateSchema.refine((value) => value !== "new" && value !== "closed", {
    message: "Use create flow for new service calls and POST /lifecycle/close to close",
  }),
  reason: z.string().max(500).optional(),
});

export const finishVisitSchema = z.object({
  nextLifecycleState: lifecycleStateSchema
    .optional()
    .refine(
      (value) =>
        value === undefined ||
        value === "waiting_assignment" ||
        value === "waiting_manager_closure" ||
        value === "waiting_for_parts" ||
        value === "waiting_customer" ||
        value === "waiting_specialist",
      { message: "Invalid next lifecycle after visit finish" },
    ),
});

export const saveWorkReportSchema = z.object({
  workPerformed: z.string().trim().max(4000).nullable().optional(),
  customerName: z.string().trim().max(160).nullable().optional(),
  customerSignatureData: z.string().min(1).max(200000).nullable().optional(),
  parts: z
    .array(
      z.object({
        inventoryItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .max(100),
});

export const closeServiceCallSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const visitIdParamSchema = z.object({
  organizationId: z.string().uuid(),
  serviceCallId: z.string().uuid(),
  visitId: z.string().uuid(),
});

export type AssignTechnicianInput = z.infer<typeof assignTechnicianSchema>;
export type TransitionLifecycleInput = z.infer<typeof transitionLifecycleSchema>;
export type FinishVisitInput = z.infer<typeof finishVisitSchema>;
export type SaveWorkReportInput = z.infer<typeof saveWorkReportSchema>;
