import { MODULE_KEYS } from "@amarok-one/permissions";
import { z } from "zod";

export const memberIdParamSchema = z.object({
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
});

export const createOrganizationMemberSchema = z.object({
  email: z.string().trim().email().max(256),
  displayName: z.string().trim().min(2).max(128),
  password: z.string().min(8).max(128),
  roleSlug: z.enum(["technician", "service-coordinator"]),
});

export const updateMemberModuleAccessSchema = z.object({
  enabledModules: z.array(z.enum(MODULE_KEYS)).min(1, "At least one module must remain enabled"),
});

export type CreateOrganizationMemberInput = z.infer<typeof createOrganizationMemberSchema>;
export type UpdateMemberModuleAccessInput = z.infer<typeof updateMemberModuleAccessSchema>;
