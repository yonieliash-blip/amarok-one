import { WorkflowDomainError } from "@amarok-one/workflow";
import { AppError, badRequest, conflict } from "./errors.js";

export function toAppErrorFromWorkflow(error: WorkflowDomainError): AppError {
  switch (error.code) {
    case "AGGREGATE_VERSION_CONFLICT":
      return conflict(error.message, error.details);
    case "INVALID_COMMAND":
    case "INVALID_STATE_TRANSITION":
    case "VISIT_NOT_FOUND":
    case "INVARIANT_VIOLATION":
      return badRequest(error.message, error.details);
    default:
      return new AppError("WORKFLOW_ERROR", error.message, 500, error.details);
  }
}

export function mapWorkflowError(error: unknown): unknown {
  if (error instanceof WorkflowDomainError) {
    return toAppErrorFromWorkflow(error);
  }
  return error;
}
