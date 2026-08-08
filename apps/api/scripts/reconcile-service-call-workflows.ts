#!/usr/bin/env tsx
/**
 * Batch workflow reconciliation + lifecycle alignment for seeded service calls.
 * Run: pnpm --filter @amarok-one/api exec tsx --env-file=../../.env scripts/reconcile-service-call-workflows.ts
 */
import { prisma } from "../src/lib/prisma.js";
import { runWithoutTenantIsolation } from "../src/lib/tenant-context.js";
import { createCompositionRoot } from "../src/composition-root.js";
import { syncSeededServiceCallWorkflowLifecycle } from "../src/modules/service-calls/service-call-workflow-seed-sync.js";
import { toServiceCallStatusDto } from "../src/lib/mappers.js";

async function main(): Promise<void> {
  await runWithoutTenantIsolation(async () => {
    const { serviceCallService } = createCompositionRoot();

    const owner = await prisma.user.findFirst({
      where: { email: "admin@demo.amarok.one", deletedAt: null },
      select: { id: true },
    });

    const serviceCalls = await prisma.serviceCall.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        organizationId: true,
        serviceCallNumber: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    });

    let synced = 0;
    let failed = 0;

    for (const row of serviceCalls) {
      try {
        const status = toServiceCallStatusDto(row.status);
        const lifecycleState = await syncSeededServiceCallWorkflowLifecycle(
          serviceCallService,
          row.organizationId,
          row.id,
          status,
          owner?.id,
        );
        synced += 1;
        console.log(`${row.serviceCallNumber}: ${lifecycleState}`);
      } catch (error) {
        failed += 1;
        console.error(`Failed to sync service call ${row.serviceCallNumber} (${row.id}):`, error);
      }
    }

    console.log(
      `Workflow sync finished: ${String(synced)} succeeded, ${String(failed)} failed, ${String(serviceCalls.length)} total.`,
    );
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
