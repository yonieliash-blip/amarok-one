import { describe, expect, it } from "vitest";
import { TARGET_LIFECYCLE_BY_STATUS } from "./service-call-workflow-seed-sync.js";

describe("service-call-workflow-seed-sync", () => {
  it("maps active operational statuses to waiting_assignment", () => {
    expect(TARGET_LIFECYCLE_BY_STATUS.open).toBe("waiting_assignment");
    expect(TARGET_LIFECYCLE_BY_STATUS.scheduled).toBe("waiting_assignment");
    expect(TARGET_LIFECYCLE_BY_STATUS.in_progress).toBe("waiting_assignment");
    expect(TARGET_LIFECYCLE_BY_STATUS.waiting_for_parts).toBe("waiting_assignment");
  });

  it("maps terminal operational statuses to closed", () => {
    expect(TARGET_LIFECYCLE_BY_STATUS.completed).toBe("closed");
    expect(TARGET_LIFECYCLE_BY_STATUS.cancelled).toBe("closed");
  });
});
