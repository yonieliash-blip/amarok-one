export type WorkflowDomainErrorCode =
  | "INVALID_COMMAND"
  | "AGGREGATE_VERSION_CONFLICT"
  | "VISIT_NOT_FOUND"
  | "INVALID_STATE_TRANSITION"
  | "INVARIANT_VIOLATION";

export class WorkflowDomainError extends Error {
  readonly code: WorkflowDomainErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: WorkflowDomainErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "WorkflowDomainError";
    this.code = code;
    this.details = details;
  }
}
