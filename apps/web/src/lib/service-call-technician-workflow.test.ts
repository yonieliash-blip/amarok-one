import { describe, expect, it } from "vitest";
import type { ServiceCallVisit } from "@amarok-one/types";
import {
  getTechnicianVisitWorkflowAction,
  selectTechnicianActiveVisit,
} from "./service-call-technician-workflow";

function visit(
  partial: Partial<ServiceCallVisit> & Pick<ServiceCallVisit, "id">,
): ServiceCallVisit {
  return {
    organizationId: "org-1",
    serviceCallId: "call-1",
    technicianId: "tech-1",
    sequence: 1,
    status: "assigned",
    createdAt: "2026-08-09T08:00:00.000Z",
    updatedAt: "2026-08-09T08:00:00.000Z",
    ...partial,
  };
}

describe("technician visit workflow controls", () => {
  it("selects the active follow-up visit without reviving finished visit history", () => {
    const selected = selectTechnicianActiveVisit(
      [
        visit({ id: "visit-1", sequence: 1, status: "finished" }),
        visit({ id: "visit-2", sequence: 2, status: "driving" }),
      ],
      "tech-1",
    );

    expect(selected?.id).toBe("visit-2");
    expect(getTechnicianVisitWorkflowAction(selected)).toBe("start_working");
  });

  it("exposes only the next legitimate technician action for each visit state", () => {
    expect(getTechnicianVisitWorkflowAction(visit({ id: "assigned" }))).toBe("start_driving");
    expect(getTechnicianVisitWorkflowAction(visit({ id: "driving", status: "driving" }))).toBe(
      "start_working",
    );
    expect(getTechnicianVisitWorkflowAction(visit({ id: "working", status: "working" }))).toBe(
      "complete_for_manager_closure",
    );
    expect(
      getTechnicianVisitWorkflowAction(visit({ id: "finished", status: "finished" })),
    ).toBeUndefined();
  });

  it("does not select another technician's visit", () => {
    expect(
      selectTechnicianActiveVisit(
        [visit({ id: "other", technicianId: "tech-2", status: "working" })],
        "tech-1",
      ),
    ).toBeUndefined();
  });
});
