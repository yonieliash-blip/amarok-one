import { prisma } from "./lib/prisma.js";
import {
  PrismaWorkflowEventStore,
  createWorkflowClock,
  createWorkflowRuntimeIds,
} from "./infrastructure/workflow/prisma-workflow-event-store.js";
import { createAccessService } from "./modules/access/access.service.js";
import { createServiceCallService } from "./modules/service-calls/service-call.service.js";
import { ServiceCallWorkflowIntegration } from "./modules/service-calls/service-call-workflow.integration.js";
import { createMorningCustomerSyncService } from "./modules/morning/morning-customer-sync.service.js";
import { createMessagesService } from "./modules/messages/messages.service.js";
import { createInspirationService } from "./modules/inspiration/inspiration.service.js";

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
  const accessService = createAccessService();
  const morningCustomerSyncService = createMorningCustomerSyncService();
  const messagesService = createMessagesService();
  const inspirationService = createInspirationService();

  return {
    eventStore,
    serviceCallWorkflow,
    serviceCallService,
    accessService,
    morningCustomerSyncService,
    messagesService,
    inspirationService,
  };
}

export type AppCompositionRoot = ReturnType<typeof createCompositionRoot>;
