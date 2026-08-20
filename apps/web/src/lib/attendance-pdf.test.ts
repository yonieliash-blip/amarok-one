import { describe, expect, it } from "vitest";
import { buildAttendancePrintHtml } from "./attendance-pdf";
import type { MonthlyAttendanceReport } from "./attendance-api";

const report: MonthlyAttendanceReport = {
  month: "2026-08",
  timeZone: "Asia/Jerusalem",
  employeeCount: 1,
  totalWorkDays: 1,
  totalNetMinutes: 450,
  locked: true,
  periodLock: null,
  employees: [
    {
      userId: "user-1",
      displayName: "דנה <מנהלת>",
      email: "dana@example.com",
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
          locationSampleCount: 1,
        },
      ],
    },
  ],
};

describe("attendance PDF print document", () => {
  it("builds a printable RTL report and escapes tenant content", () => {
    const html = buildAttendancePrintHtml(report, "חברה <בדיקה>", "he");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("חברה &lt;בדיקה&gt;");
    expect(html).toContain("דנה &lt;מנהלת&gt;");
    expect(html).toContain("נעול לשכר");
    expect(html).toContain("7:30");
    expect(html).not.toContain("חברה <בדיקה>");
  });
});
