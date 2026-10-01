import { MODULE_KEYS } from "@amarok-one/permissions";
import { z } from "zod";

export const memberIdParamSchema = z.object({
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
});

export const updateMemberModuleAccessSchema = z.object({
  enabledModules: z.array(z.enum(MODULE_KEYS)).min(1, "At least one module must remain enabled"),
});

/** New staff accounts are deliberately limited to the two operational roles. */
export const createOrganizationMemberSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(256),
  initialPassword: z.string().min(12).max(128),
  primaryRoleSlug: z.enum(["technician", "service-coordinator"]),
  enabledModules: z.array(z.enum(MODULE_KEYS)).min(1, "At least one module must be enabled"),
});

export type UpdateMemberModuleAccessInput = z.infer<typeof updateMemberModuleAccessSchema>;
export type CreateOrganizationMemberInput = z.infer<typeof createOrganizationMemberSchema>;
