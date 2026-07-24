import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function writeAuditLog(input: {
  organizationId: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
