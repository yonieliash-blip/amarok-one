import { MODULE_KEYS } from "@amarok-one/permissions";
import { z } from "zod";

export const memberIdParamSchema = z.object({
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
});

export const updateMemberModuleAccessSchema = z.object({
  enabledModules: z.array(z.enum(MODULE_KEYS)).min(1, "At least one module must remain enabled"),
});

export const updateMemberStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

const birthDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const displayNameSchema = z.string().trim().min(2).max(120);

export const updateMemberBirthDateSchema = z.object({
  birthDate: birthDateSchema.nullable(),
});

export const updateMemberDisplayNameSchema = z.object({
  displayName: displayNameSchema,
});

/** New staff accounts are deliberately limited to the two operational roles. */
export const createOrganizationMemberSchema = z.object({
  displayName: displayNameSchema,
  email: z.string().trim().email().max(256),
  initialPassword: z.string().min(12).max(128),
  primaryRoleSlug: z.enum(["technician", "service-coordinator"]),
  enabledModules: z.array(z.enum(MODULE_KEYS)).min(1, "At least one module must be enabled"),
  birthDate: birthDateSchema.optional(),
});

export type UpdateMemberModuleAccessInput = z.infer<typeof updateMemberModuleAccessSchema>;
export type UpdateMemberStatusInput = z.infer<typeof updateMemberStatusSchema>;
export type UpdateMemberBirthDateInput = z.infer<typeof updateMemberBirthDateSchema>;
export type UpdateMemberDisplayNameInput = z.infer<typeof updateMemberDisplayNameSchema>;
export type CreateOrganizationMemberInput = z.infer<typeof createOrganizationMemberSchema>;
