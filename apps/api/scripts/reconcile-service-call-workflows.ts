#!/usr/bin/env tsx
/**
 * Batch workflow reconciliation for existing service calls (no HTTP GET side effects).
 * Run: pnpm --filter @amarok-one/api exec tsx --env-file=../../.env scripts/reconcile-service-call-workflows.ts
 */
import { prisma } from "../src/lib/prisma.js";
import { createCompositionRoot } from "../src/composition-root.js";

async function main(): Promise<void> {
  const { serviceCallService } = createCompositionRoot();

  const serviceCalls = await prisma.serviceCall.findMany({
    where: { deletedAt: null },
    select: { id: true, organizationId: true },
    orderBy: { createdAt: "asc" },
  });

  let reconciled = 0;
  let failed = 0;

  for (const row of serviceCalls) {
    try {
      await serviceCallService.reconcileServiceCallWorkflow(row.organizationId, row.id);
      reconciled += 1;
    } catch (error) {
      failed += 1;
      console.error(`Failed to reconcile service call ${row.id}:`, error);
    }
  }

  console.log(
    `Workflow reconciliation finished: ${String(reconciled)} succeeded, ${String(failed)} failed, ${String(serviceCalls.length)} total.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
