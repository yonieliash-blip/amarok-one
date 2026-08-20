import { describe, expect, it } from "vitest";
import { buildAttendanceCsv } from "./attendance-csv";

describe("attendance CSV", () => {
  it("exports daily rows with Excel-compatible BOM and escaped employee names", () => {
    const csv = buildAttendanceCsv({
      month: "2026-08",
      timeZone: "Asia/Jerusalem",
      employeeCount: 1,
      totalWorkDays: 1,
      totalNetMinutes: 450,
      employees: [
        {
          userId: "user-1",
          displayName: 'Dana, "D"',
          email: "d@example.com",
          workDays: 1,
          grossMinutes: 480,
          breakMinutes: 30,
          netMinutes: 450,
          days: [
            {
              id: "day-1",
              status: "COMPLETED",
              reviewStatus: "APPROVED",
              approvedAt: "2026-08-10T15:00:00Z",
              startedAt: "2026-08-10T05:00:00Z",
              endedAt: "2026-08-10T13:00:00Z",
              grossMinutes: 480,
              breakMinutes: 30,
              netMinutes: 450,
              locationCaptured: true,
              locationSampleCount: 0,
            },
          ],
        },
      ],
    });
    expect(csv.startsWith("\uFEFFEmployee")).toBe(true);
    expect(csv).toContain('"Dana, ""D"""');
    expect(csv).toContain(",7.50,APPROVED,Yes");
  });
});
