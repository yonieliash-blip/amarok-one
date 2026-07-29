import type { ServiceCall } from "@amarok-one/types";
import {
  WorkflowCommand,
  WorkflowModule,
  applyWorkflowEvent,
  asOrganizationId,
  asServiceCallId,
  asWorkflowCommandId,
  type WorkflowEventStore,
} from "@amarok-one/workflow";
import type { ServiceCallWorkflowPort, WorkflowSyncContext } from "./service-call-workflow.port.js";

export interface ServiceCallWorkflowIntegrationDeps {
  eventStore: WorkflowEventStore;
  clock: { now(): string };
  ids: {
    nextEventId(): string;
    nextStateId(): string;
    nextVisitId(): string;
  };
}

/**
 * ACL adapter: initializes workflow streams and projects operational state from events.
 * Lifecycle mutations are forbidden via PATCH — use lifecycle API only.
 */
export class ServiceCallWorkflowIntegration implements ServiceCallWorkflowPort {
  constructor(private readonly deps: ServiceCallWorkflowIntegrationDeps) {}

  async reconcileServiceCallWorkflow(
    serviceCall: ServiceCall,
    actorId?: string,
    context?: WorkflowSyncContext,
  ): Promise<void> {
    const store = this.resolveStore(context);
    const organizationId = asOrganizationId(serviceCall.organizationId);
    const aggregateId = asServiceCallId(serviceCall.id);
    const events = await store.loadEvents(organizationId, aggregateId);

    if (events.length === 0) {
      await this.syncAfterCreate(serviceCall, actorId, context);
    }
  }

  async syncAfterCreate(
    serviceCall: ServiceCall,
    actorId?: string,
    context?: WorkflowSyncContext,
  ): Promise<void> {
    await this.ensureInitialized(serviceCall, actorId, context);
  }

  async syncAfterUpdate(
    _before: ServiceCall,
    after: ServiceCall,
    actorId?: string,
    context?: WorkflowSyncContext,
  ): Promise<void> {
    await this.ensureInitialized(after, actorId, context);
  }

  private resolveStore(context?: WorkflowSyncContext): WorkflowEventStore {
    return context?.eventStore ?? this.deps.eventStore;
  }

  private workflowModuleFor(store: WorkflowEventStore): WorkflowModule {
    return new WorkflowModule({
      eventStore: store,
      clock: this.deps.clock,
      ids: this.deps.ids,
    });
  }

  private async ensureInitialized(
    serviceCall: ServiceCall,
    actorId: string | undefined,
    context?: WorkflowSyncContext,
  ): Promise<void> {
    const store = this.resolveStore(context);
    const organizationId = asOrganizationId(serviceCall.organizationId);
    const aggregateId = asServiceCallId(serviceCall.id);
    const existing = await store.loadEvents(organizationId, aggregateId);
    if (existing.length > 0) {
      return;
    }

    const workflowModule = this.workflowModuleFor(store);

    await workflowModule.dispatch(
      WorkflowCommand.create({
        id: asWorkflowCommandId(crypto.randomUUID()),
        organizationId,
        aggregateId,
        type: "InitializeServiceCallWorkflow",
        payload: {
          externalServiceCallId: serviceCall.id,
          initialStateKey: "draft",
          initialLifecycleKey: "new",
        },
        issuedAt: this.deps.clock.now(),
        issuerId: actorId,
        idempotencyKey: `workflow:init:${serviceCall.id}`,
      }),
    );
  }
}

/** Rehydrate aggregate from store (for tests and projection helpers). */
export async function loadWorkflowAggregate(
  store: WorkflowEventStore,
  organizationId: string,
  serviceCallId: string,
) {
  const events = await store.loadEvents(
    asOrganizationId(organizationId),
    asServiceCallId(serviceCallId),
  );
  if (events.length === 0) {
    return null;
  }
  return applyWorkflowEvent.rehydrate(events);
}
