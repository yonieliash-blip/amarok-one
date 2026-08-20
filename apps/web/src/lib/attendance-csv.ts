import type { MonthlyAttendanceReport } from "./attendance-api";

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildAttendanceCsv(report: MonthlyAttendanceReport): string {
  const rows: Array<Array<string | number>> = [
    [
      "Employee",
      "Email",
      "Date",
      "Start",
      "End",
      "Gross hours",
      "Break hours",
      "Net hours",
      "Review status",
      "GPS captured",
    ],
  ];
  for (const employee of report.employees) {
    for (const day of employee.days) {
      rows.push([
        employee.displayName,
        employee.email,
        day.startedAt.slice(0, 10),
        day.startedAt,
        day.endedAt ?? "",
        (day.grossMinutes / 60).toFixed(2),
        (day.breakMinutes / 60).toFixed(2),
        (day.netMinutes / 60).toFixed(2),
        day.reviewStatus,
        day.locationCaptured ? "Yes" : "No",
      ]);
    }
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function downloadAttendanceCsv(report: MonthlyAttendanceReport): void {
  const blob = new Blob([buildAttendanceCsv(report)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance-${report.month}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
