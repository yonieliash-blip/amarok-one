import type { ServiceCall } from "@amarok-one/types";
import type { WorkflowEventStore } from "@amarok-one/workflow";

export interface WorkflowSyncContext {
  eventStore: WorkflowEventStore;
}

/** Outbound port: record workflow side effects for service-call mutations without changing API rules. */
export interface ServiceCallWorkflowPort {
  /**
   * Brings workflow stream in line with the current service-call snapshot.
   * Must not be invoked from read-only HTTP handlers (use batch/ write paths only).
   */
  reconcileServiceCallWorkflow(
    serviceCall: ServiceCall,
    actorId?: string,
    context?: WorkflowSyncContext,
  ): Promise<void>;

  syncAfterCreate(
    serviceCall: ServiceCall,
    actorId?: string,
    context?: WorkflowSyncContext,
  ): Promise<void>;

  syncAfterUpdate(
    before: ServiceCall,
    after: ServiceCall,
    actorId?: string,
    context?: WorkflowSyncContext,
  ): Promise<void>;
}
