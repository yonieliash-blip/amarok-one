// Domain
export {
  ServiceCallLifecycle,
  assertServiceCallLifecycleTransition,
  getAllowedServiceCallLifecycleTransitions,
  isServiceCallLifecycleKey,
  type ServiceCallLifecycleKey,
  type ServiceCallLifecycleProps,
} from "./domain/service-call-lifecycle.js";
export {
  assertVisitStatusTransition,
  assertVisitOwnedByTechnician,
  isActiveVisitStatus,
} from "./domain/visit-lifecycle.js";
export { ServiceCall, isWorkflowStateKey, type ServiceCallProps } from "./domain/service-call.js";
export { applyWorkflowEvent } from "./domain/service-call.rehydration.js";
export { Visit, type VisitProps, type VisitStatus } from "./domain/visit.js";
export {
  WorkflowState,
  type WorkflowStateKey,
  type WorkflowStateProps,
} from "./domain/workflow-state.js";
export {
  WorkflowEvent,
  type WorkflowEventProps,
  type WorkflowEventType,
} from "./domain/workflow-event.js";
export {
  WorkflowCommand,
  type WorkflowCommandProps,
  type WorkflowCommandType,
} from "./domain/workflow-command.js";
export {
  WorkflowEngine,
  createServiceCallAggregateId,
  planWorkflowStatePath,
  type WorkflowEngineClock,
  type WorkflowEngineIds,
  type WorkflowEngineResult,
} from "./domain/workflow-engine.js";
export { WorkflowDomainError, type WorkflowDomainErrorCode } from "./domain/domain-error.js";
export {
  asOrganizationId,
  asServiceCallId,
  asVisitId,
  asWorkflowCommandId,
  asWorkflowEventId,
  asWorkflowStateId,
  type OrganizationId,
  type ServiceCallId,
  type VisitId,
  type WorkflowCommandId,
  type WorkflowEventId,
  type WorkflowStateId,
} from "./domain/identifiers.js";

// Application
export { WorkflowModule, type DispatchCommandResult } from "./application/workflow-module.js";
export type {
  AppendWorkflowEventsInput,
  WorkflowAggregateLoader,
  WorkflowCommandBus,
  WorkflowEventStore,
  WorkflowModuleDependencies,
} from "./application/ports/workflow-event-store.port.js";

// Infrastructure (adapters for tests / local dev only until Postgres adapter lands)
export { InMemoryWorkflowEventStore } from "./infrastructure/memory/in-memory-workflow-event-store.js";
