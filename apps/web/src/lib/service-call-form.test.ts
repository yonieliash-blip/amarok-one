import { describe, expect, it } from "vitest";
import {
  buildCreatePayload,
  buildUpdatePayload,
  EMPTY_SERVICE_CALL_FORM,
} from "./service-call-form";

describe("service call form payloads", () => {
  it("builds create payload without lifecycle fields", () => {
    const payload = buildCreatePayload(
      {
        ...EMPTY_SERVICE_CALL_FORM,
        serviceCallNumber: "SC-100",
        title: "Leak repair",
        customerId: "c1",
        equipmentId: "e1",
        priority: "high",
      },
      { openedAt: "2026-07-29T08:00:00.000Z" },
    );

    expect(payload).toMatchObject({
      serviceCallNumber: "SC-100",
      title: "Leak repair",
      customerId: "c1",
      equipmentId: "e1",
      priority: "high",
    });
    expect("status" in payload).toBe(false);
    expect("assignedUserId" in payload).toBe(false);
  });

  it("builds update payload for metadata only", () => {
    const payload = buildUpdatePayload(
      {
        ...EMPTY_SERVICE_CALL_FORM,
        title: "Updated title",
        notes: "Field note",
        customerId: "c1",
        equipmentId: "e1",
      },
      { scheduledAt: null },
    );

    expect(payload.title).toBe("Updated title");
    expect(payload.notes).toBe("Field note");
    expect("completedAt" in payload).toBe(false);
  });
});
