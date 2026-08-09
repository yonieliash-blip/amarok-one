import { describe, expect, it } from "vitest";
import {
  getAvailableManagerLifecycleTransitions,
  isServiceCallClosureAvailable,
} from "./service-call-lifecycle-filter";

describe("service call lifecycle actions", () => {
  it("does not offer closure when the API does not allow the closed transition", () => {
    expect(isServiceCallClosureAvailable(["working", "assigned"])).toBe(false);
  });

  it("fails closed while transition data is unavailable", () => {
    expect(isServiceCallClosureAvailable()).toBe(false);
    expect(getAvailableManagerLifecycleTransitions(undefined, "driving")).toEqual([]);
  });

  it("offers closure when the API allows the closed transition", () => {
    expect(isServiceCallClosureAvailable(["closed", "working"])).toBe(true);
  });

  it("only offers manager transitions allowed by the API", () => {
    expect(
      getAvailableManagerLifecycleTransitions(
        ["working", "waiting_manager_closure"],
        "waiting_for_parts",
      ),
    ).toEqual(["waiting_manager_closure"]);
  });
});
