import { describe, expect, it } from "vitest";
import { mergeTimeline } from "./timeline";

describe("mergeTimeline", () => {
  it("merges and sorts workflow and local entries by time", () => {
    const merged = mergeTimeline(
      [
        {
          id: "e1",
          type: "visit_working_started",
          sequence: 2,
          occurredAt: "2026-07-29T10:00:00.000Z",
          payload: {},
        },
      ],
      [
        {
          id: "l1",
          type: "note",
          label: "Field note updated",
          occurredAt: "2026-07-29T09:30:00.000Z",
        },
      ],
    );
    expect(merged.map((item) => item.id)).toEqual(["local-l1", "wf-e1"]);
  });
});
