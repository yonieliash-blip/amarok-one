import { z } from "zod";

export const createTechnicianSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(256),
  password: z.string().min(8).max(128),
});

export type CreateTechnicianInput = z.infer<typeof createTechnicianSchema>;
