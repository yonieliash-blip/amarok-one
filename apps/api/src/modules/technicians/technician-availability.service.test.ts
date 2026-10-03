import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma.js", () => ({ prisma: {} }));
vi.mock("../../lib/audit.js", () => ({ writeAuditLog: vi.fn() }));

import { assertTechnicianCanBeScheduled } from "./technician-availability.service.js";

function transactionHarness(input?: {
  unavailable?: { note: string | null } | null;
  visits?: Array<{ id: string; scheduledStart: Date | null; scheduledEnd: Date | null }>;
}) {
  return {
    technicianAvailability: {
      findFirst: vi.fn().mockResolvedValue(input?.unavailable ?? null),
    },
    serviceCallVisit: {
      findMany: vi.fn().mockResolvedValue(input?.visits ?? []),
    },
  } as never;
}

const input = {
  organizationId: "11111111-1111-4111-8111-111111111111",
  technicianId: "22222222-2222-4222-8222-222222222222",
  scheduledStart: "2026-10-03T07:00:00.000Z",
  scheduledEnd: "2026-10-03T08:00:00.000Z",
};

describe("assertTechnicianCanBeScheduled", () => {
  it("rejects an explicitly unavailable technician", async () => {
    const tx = transactionHarness({ unavailable: { note: "חופשה" } });

    await expect(assertTechnicianCanBeScheduled(tx, input)).rejects.toThrow("אינו זמין");
  });

  it("rejects a visit that overlaps an active assignment", async () => {
    const tx = transactionHarness({
      visits: [
        {
          id: "visit-1",
          scheduledStart: new Date("2026-10-03T07:30:00.000Z"),
          scheduledEnd: new Date("2026-10-03T08:30:00.000Z"),
        },
      ],
    });

    await expect(assertTechnicianCanBeScheduled(tx, input)).rejects.toThrow("חופף");
  });

  it("allows a separate appointment window", async () => {
    const tx = transactionHarness({
      visits: [
        {
          id: "visit-1",
          scheduledStart: new Date("2026-10-03T09:00:00.000Z"),
          scheduledEnd: new Date("2026-10-03T10:00:00.000Z"),
        },
      ],
    });

    await expect(assertTechnicianCanBeScheduled(tx, input)).resolves.toBeUndefined();
  });

  it("checks availability against the Israeli business day at a UTC date boundary", async () => {
    const tx = transactionHarness();

    await assertTechnicianCanBeScheduled(tx, {
      ...input,
      scheduledStart: "2026-10-02T22:30:00.000Z",
      scheduledEnd: "2026-10-02T23:30:00.000Z",
    });

    expect(tx.technicianAvailability.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ date: new Date("2026-10-03T00:00:00.000Z") }),
      }),
    );
  });
});
