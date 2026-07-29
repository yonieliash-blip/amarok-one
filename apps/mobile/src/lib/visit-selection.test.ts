import { describe, expect, it } from "vitest";
import type { ServiceCallVisit } from "@amarok-one/types";
import { nextLifecycleForFinishOutcome } from "../api/service-calls";
import { selectTechnicianActiveVisit } from "./visit-selection";

function visit(
  partial: Partial<ServiceCallVisit> & Pick<ServiceCallVisit, "id">,
): ServiceCallVisit {
  return {
    organizationId: "org",
    serviceCallId: "sc",
    technicianId: "tech-1",
    sequence: 1,
    status: "assigned",
    createdAt: "2026-07-29T08:00:00.000Z",
    updatedAt: "2026-07-29T08:00:00.000Z",
    ...partial,
  };
}

describe("visit selection", () => {
  it("picks highest-sequence active visit for technician", () => {
    const selected = selectTechnicianActiveVisit(
      [
        visit({ id: "1", sequence: 1, status: "assigned" }),
        visit({ id: "2", sequence: 2, status: "working" }),
        visit({ id: "3", sequence: 3, status: "finished", technicianId: "tech-1" }),
      ],
      "tech-1",
    );
    expect(selected?.id).toBe("2");
  });
});

describe("finish visit outcomes", () => {
  it("maps dispatcher and parts outcomes to workflow lifecycle keys", () => {
    expect(nextLifecycleForFinishOutcome("dispatcher")).toBe("waiting_assignment");
    expect(nextLifecycleForFinishOutcome("waiting_for_parts")).toBe("waiting_for_parts");
  });
});
