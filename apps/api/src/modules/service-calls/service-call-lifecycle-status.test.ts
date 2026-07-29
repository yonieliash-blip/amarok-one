import { describe, expect, it } from "vitest";
import { legacyStatusForLifecycle } from "./service-call-lifecycle-status.js";

describe("legacyStatusForLifecycle", () => {
  it("maps control-center states to legacy API status", () => {
    expect(legacyStatusForLifecycle("waiting_assignment")).toBe("open");
    expect(legacyStatusForLifecycle("assigned")).toBe("scheduled");
    expect(legacyStatusForLifecycle("working")).toBe("in_progress");
    expect(legacyStatusForLifecycle("closed")).toBe("completed");
  });
});
