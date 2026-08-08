import { MODULE_KEYS } from "@amarok-one/permissions";
import { z } from "zod";

export const memberIdParamSchema = z.object({
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
});

export const updateMemberModuleAccessSchema = z.object({
  enabledModules: z.array(z.enum(MODULE_KEYS)).min(1, "At least one module must remain enabled"),
});

export type UpdateMemberModuleAccessInput = z.infer<typeof updateMemberModuleAccessSchema>;
