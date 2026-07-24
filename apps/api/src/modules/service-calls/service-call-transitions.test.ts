import { describe, expect, it } from "vitest";
import {
  canTransitionServiceCallStatus,
  getAllowedServiceCallStatusTransitions,
} from "./service-call-transitions.js";

describe("service call status transitions", () => {
  it("allows open to scheduled and in_progress", () => {
    expect(canTransitionServiceCallStatus("open", "scheduled")).toBe(true);
    expect(canTransitionServiceCallStatus("open", "in_progress")).toBe(true);
  });

  it("blocks completed to in_progress", () => {
    expect(canTransitionServiceCallStatus("completed", "in_progress")).toBe(false);
  });

  it("allows reopening completed calls to open", () => {
    expect(canTransitionServiceCallStatus("completed", "open")).toBe(true);
  });

  it("allows waiting_for_parts back to in_progress", () => {
    expect(canTransitionServiceCallStatus("waiting_for_parts", "in_progress")).toBe(true);
  });

  it("returns allowed transitions for in_progress", () => {
    expect(getAllowedServiceCallStatusTransitions("in_progress")).toEqual([
      "waiting_for_parts",
      "completed",
      "cancelled",
      "scheduled",
    ]);
  });

  it("treats same status as valid", () => {
    expect(canTransitionServiceCallStatus("scheduled", "scheduled")).toBe(true);
  });
});
