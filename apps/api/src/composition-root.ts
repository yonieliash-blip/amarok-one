import { prisma } from "./lib/prisma.js";
import {
  PrismaWorkflowEventStore,
  createWorkflowClock,
  createWorkflowRuntimeIds,
} from "./infrastructure/workflow/prisma-workflow-event-store.js";
import { createServiceCallService } from "./modules/service-calls/service-call.service.js";
import { ServiceCallWorkflowIntegration } from "./modules/service-calls/service-call-workflow.integration.js";

export function createCompositionRoot() {
  const eventStore = new PrismaWorkflowEventStore(prisma);
  const clock = createWorkflowClock();
  const ids = createWorkflowRuntimeIds();
  const serviceCallWorkflow = new ServiceCallWorkflowIntegration({
    eventStore,
    clock,
    ids,
  });
  const serviceCallService = createServiceCallService({
    workflow: serviceCallWorkflow,
    clock,
    ids,
  });

  return {
    eventStore,
    serviceCallWorkflow,
    serviceCallService,
  };
}

export type AppCompositionRoot = ReturnType<typeof createCompositionRoot>;
