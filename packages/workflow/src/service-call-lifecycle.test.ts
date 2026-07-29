import { describe, expect, it } from "vitest";
import {
  assertServiceCallLifecycleTransition,
  ServiceCallLifecycle,
} from "./domain/service-call-lifecycle.js";
import { WorkflowDomainError } from "./domain/domain-error.js";
import { assertVisitStatusTransition } from "./domain/visit-lifecycle.js";

describe("ServiceCallLifecycle", () => {
  it("allows new → waiting_assignment", () => {
    expect(() => assertServiceCallLifecycleTransition("new", "waiting_assignment")).not.toThrow();
  });

  it("rejects closed → working", () => {
    expect(() => assertServiceCallLifecycleTransition("closed", "working")).toThrow(
      WorkflowDomainError,
    );
  });

  it("tracks enteredAt on withKey", () => {
    const lifecycle = ServiceCallLifecycle.create({
      id: "00000000-0000-0000-0000-000000000001" as never,
      serviceCallId: "00000000-0000-0000-0000-000000000002" as never,
      key: "new",
      enteredAt: "2026-07-29T00:00:00.000Z",
    });
    const next = lifecycle.withKey("waiting_assignment", "2026-07-29T01:00:00.000Z");
    expect(next.key).toBe("waiting_assignment");
    expect(next.enteredAt).toBe("2026-07-29T01:00:00.000Z");
  });
});

describe("Visit lifecycle", () => {
  it("allows assigned → driving → working → finished", () => {
    expect(() => assertVisitStatusTransition("assigned", "driving")).not.toThrow();
    expect(() => assertVisitStatusTransition("driving", "working")).not.toThrow();
    expect(() => assertVisitStatusTransition("working", "finished")).not.toThrow();
  });
});
