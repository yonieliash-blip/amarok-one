import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaTransaction = Prisma.TransactionClient;
type NumberScope = "customer-number" | "service-call-number";

const NUMBER_PREFIXES: Record<NumberScope, string> = {
  "customer-number": "AM-CU-",
  "service-call-number": "AM-SE-",
};

function formatOperationalNumber(scope: NumberScope, value: number): string {
  return `${NUMBER_PREFIXES[scope]}${String(value).padStart(2, "0")}`;
}

/**
 * Reserves a tenant-scoped human-facing number. The update is atomic, so concurrent creates
 * cannot receive the same number.
 */
export async function reserveOperationalNumber(
  tx: PrismaTransaction | PrismaClient,
  organizationId: string,
  scope: NumberScope,
): Promise<string> {
  const sequence = await tx.organizationNumberSequence.upsert({
    where: { organizationId_scope: { organizationId, scope } },
    create: { organizationId, scope, nextValue: 2 },
    update: { nextValue: { increment: 1 } },
    select: { nextValue: true },
  });

  return formatOperationalNumber(scope, sequence.nextValue - 1);
}
