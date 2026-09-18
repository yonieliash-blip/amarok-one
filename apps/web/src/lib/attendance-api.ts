import { apiRequest } from "./api-client";

export interface AttendanceDay {
  id: string;
  status: "ACTIVE" | "COMPLETED";
  reviewStatus: "PENDING" | "APPROVED";
  approvedAt: string | null;
  startedAt: string;
  endedAt: string | null;
  grossMinutes: number;
  breakMinutes: number;
  netMinutes: number;
  locationCaptured: boolean;
  locationSampleCount: number;
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
  locked: boolean;
  periodLock: {
    id: string;
    lockedAt: string;
    lockedById: string;
    unlockedAt: string | null;
    unlockReason: string | null;
  } | null;
  employees: AttendanceEmployee[];
}

export interface WorkDayLocationPoint {
  id: string;
  recordedAt: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface CurrentTechnicianLocation {
  userId: string;
  displayName: string;
  email: string;
  workDayId: string | null;
  startedAt: string | null;
  location: {
    recordedAt: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    source: "sample" | "clock_in";
  } | null;
}

export async function getCurrentTechnicianLocationsRequest(
  organizationId: string,
  accessToken: string,
): Promise<CurrentTechnicianLocation[]> {
  const response = await apiRequest<CurrentTechnicianLocation[]>(
    `/organizations/${organizationId}/attendance/current-technician-locations`,
    { accessToken },
  );
  return response.data;
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

export async function lockAttendancePeriodRequest(
  organizationId: string,
  accessToken: string,
  month: string,
): Promise<void> {
  await apiRequest(
    `/organizations/${organizationId}/attendance/periods/${encodeURIComponent(month)}/lock`,
    { method: "POST", accessToken },
  );
}

export async function unlockAttendancePeriodRequest(
  organizationId: string,
  accessToken: string,
  month: string,
  reason: string,
): Promise<void> {
  await apiRequest(
    `/organizations/${organizationId}/attendance/periods/${encodeURIComponent(month)}/unlock`,
    { method: "POST", accessToken, body: JSON.stringify({ reason }) },
  );
}

export async function approveWorkDayRequest(
  organizationId: string,
  accessToken: string,
  workDayId: string,
): Promise<void> {
  await apiRequest(`/organizations/${organizationId}/attendance/work-days/${workDayId}/approve`, {
    method: "POST",
    accessToken,
  });
}

export async function correctWorkDayRequest(
  organizationId: string,
  accessToken: string,
  workDayId: string,
  input: { startedAt: string; endedAt: string; reason: string },
): Promise<void> {
  await apiRequest(`/organizations/${organizationId}/attendance/work-days/${workDayId}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input),
  });
}

export async function getWorkDayLocationsRequest(
  organizationId: string,
  accessToken: string,
  workDayId: string,
): Promise<WorkDayLocationPoint[]> {
  const response = await apiRequest<WorkDayLocationPoint[]>(
    `/organizations/${organizationId}/attendance/work-days/${workDayId}/locations`,
    { accessToken },
  );
  return response.data;
}
