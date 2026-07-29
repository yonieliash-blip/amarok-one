/** Branded identifiers for the workflow bounded context (no dependency on persistence). */
export type OrganizationId = string & { readonly __brand: "OrganizationId" };
export type ServiceCallId = string & { readonly __brand: "WorkflowServiceCallId" };
export type VisitId = string & { readonly __brand: "VisitId" };
export type WorkflowStateId = string & { readonly __brand: "WorkflowStateId" };
export type WorkflowEventId = string & { readonly __brand: "WorkflowEventId" };
export type WorkflowCommandId = string & { readonly __brand: "WorkflowCommandId" };

export function asOrganizationId(value: string): OrganizationId {
  return value as OrganizationId;
}

export function asServiceCallId(value: string): ServiceCallId {
  return value as ServiceCallId;
}

export function asVisitId(value: string): VisitId {
  return value as VisitId;
}

export function asWorkflowStateId(value: string): WorkflowStateId {
  return value as WorkflowStateId;
}

export function asWorkflowEventId(value: string): WorkflowEventId {
  return value as WorkflowEventId;
}

export function asWorkflowCommandId(value: string): WorkflowCommandId {
  return value as WorkflowCommandId;
}
