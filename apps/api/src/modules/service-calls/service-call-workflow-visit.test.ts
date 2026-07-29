import { describe, expect, it } from "vitest";
import { selectLatestVisitByStatuses } from "./service-call-workflow-visit.js";

describe("selectLatestVisitByStatuses", () => {
  it("selects the highest sequence visit for the requested statuses", () => {
    const selected = selectLatestVisitByStatuses(
      [
        { id: "a", sequence: 1, status: "planned" },
        { id: "b", sequence: 3, status: "planned" },
        { id: "c", sequence: 2, status: "in_progress" },
      ],
      ["planned"],
    );

    expect(selected?.id).toBe("b");
  });
});
