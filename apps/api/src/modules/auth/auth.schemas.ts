import { z } from "zod";
import { slugSchema } from "../../lib/schemas.js";

export const loginSchema = z.object({
  email: z.string().trim().email().max(256),
  password: z.string().min(8).max(128),
  organizationSlug: slugSchema.optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(32).max(2048),
  activeRoleId: z.string().uuid().optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(32).max(2048).optional(),
});

export const switchRoleSchema = z.object({
  roleId: z.string().uuid(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type SwitchRoleInput = z.infer<typeof switchRoleSchema>;
