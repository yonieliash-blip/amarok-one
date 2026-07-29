import { describe, expect, it } from "vitest";
import { WorkflowDomainError } from "@amarok-one/workflow";
import { isAppError } from "./errors.js";
import { mapWorkflowError, toAppErrorFromWorkflow } from "./workflow-errors.js";

describe("workflow-errors", () => {
  it("maps aggregate version conflicts to HTTP 409", () => {
    const appError = toAppErrorFromWorkflow(
      new WorkflowDomainError("AGGREGATE_VERSION_CONFLICT", "Concurrent write detected"),
    );
    expect(appError.status).toBe(409);
    expect(appError.code).toBe("CONFLICT");
  });

  it("maps domain validation failures to HTTP 400", () => {
    const appError = toAppErrorFromWorkflow(
      new WorkflowDomainError("INVARIANT_VIOLATION", "Workflow invariant failed"),
    );
    expect(appError.status).toBe(400);
    expect(appError.code).toBe("VALIDATION_ERROR");
  });

  it("wraps WorkflowDomainError via mapWorkflowError", () => {
    const mapped = mapWorkflowError(new WorkflowDomainError("INVALID_COMMAND", "bad command"));
    expect(isAppError(mapped)).toBe(true);
    if (isAppError(mapped)) {
      expect(mapped.status).toBe(400);
    }
  });

  it("passes through non-workflow errors unchanged", () => {
    const original = new Error("db down");
    expect(mapWorkflowError(original)).toBe(original);
  });
});
