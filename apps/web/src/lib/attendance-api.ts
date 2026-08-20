import { apiRequest } from "./api-client";

export interface AttendanceDay {
  id: string;
  status: "ACTIVE" | "COMPLETED";
  startedAt: string;
  endedAt: string | null;
  grossMinutes: number;
  breakMinutes: number;
  netMinutes: number;
  locationCaptured: boolean;
}

export interface AttendanceEmployee {
  userId: string;
  displayName: string;
  email: string;
  workDays: number;
  grossMinutes: number;
  breakMinutes: number;
  netMinutes: number;
  days: AttendanceDay[];
}

export interface MonthlyAttendanceReport {
  month: string;
  timeZone: string;
  employeeCount: number;
  totalWorkDays: number;
  totalNetMinutes: number;
  employees: AttendanceEmployee[];
}

export async function getMonthlyAttendanceReportRequest(
  organizationId: string,
  accessToken: string,
  month: string,
): Promise<MonthlyAttendanceReport> {
  const response = await apiRequest<MonthlyAttendanceReport>(
    `/organizations/${organizationId}/attendance/reports/monthly?month=${encodeURIComponent(month)}`,
    { accessToken },
  );
  return response.data;
}
