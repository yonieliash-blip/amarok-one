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
  systemInactiveMinutes: number;
  activitySampleCount: number;
  locationCaptured: boolean;
  locationSampleCount: number;
}

export interface CurrentWorkDay {
  id: string;
  status: "ACTIVE" | "COMPLETED";
  startedAt: string;
  endedAt: string | null;
}

export interface AttendanceLocationInput {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface AttendanceEmployee {
  userId: string;
  displayName: string;
  email: string;
  workDays: number;
  grossMinutes: number;
  breakMinutes: number;
  netMinutes: number;
  systemInactiveMinutes: number;
  days: AttendanceDay[];
}

export interface MonthlyAttendanceReport {
  month: string;
  timeZone: string;
  employeeCount: number;
  totalWorkDays: number;
  totalNetMinutes: number;
  totalSystemInactiveMinutes: number;
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

export interface DailyAttendanceEmployee extends AttendanceEmployee {
  role: { slug: string; name: string } | null;
}

export interface DailyAttendanceReport {
  date: string;
  timeZone: string;
  employeeCount: number;
  totalWorkDays: number;
  totalGrossMinutes: number;
  totalBreakMinutes: number;
  totalNetMinutes: number;
  totalSystemInactiveMinutes: number;
  employees: DailyAttendanceEmployee[];
}

export interface WorkDayLocationPoint {
  id: string;
  recordedAt: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface LiveTechnicianLocation {
  workDayId: string;
  userId: string;
  displayName: string;
  startedAt: string;
  lastUpdatedAt: string;
  lastKnownLocation: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    source: "tracking" | "clock_in";
  } | null;
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

export async function getDailyAttendanceReportRequest(
  organizationId: string,
  accessToken: string,
  date: string,
): Promise<DailyAttendanceReport> {
  const response = await apiRequest<DailyAttendanceReport>(
    `/organizations/${organizationId}/attendance/reports/daily?date=${encodeURIComponent(date)}`,
    { accessToken },
  );
  return response.data;
}

export async function getCurrentWorkDayRequest(
  organizationId: string,
  accessToken: string,
): Promise<CurrentWorkDay | null> {
  const response = await apiRequest<CurrentWorkDay | null>(
    `/organizations/${organizationId}/attendance/current`,
    { accessToken },
  );
  return response.data;
}

export async function recordWorkDayActivityRequest(
  organizationId: string,
  accessToken: string,
): Promise<void> {
  await apiRequest(`/organizations/${organizationId}/attendance/activity`, {
    method: "POST",
    accessToken,
  });
}

async function submitWorkDayActionRequest(
  organizationId: string,
  accessToken: string,
  action: "start" | "end",
  location: AttendanceLocationInput | null,
): Promise<CurrentWorkDay> {
  const response = await apiRequest<CurrentWorkDay>(
    `/organizations/${organizationId}/attendance/${action}`,
    { method: "POST", accessToken, body: JSON.stringify({ location }) },
  );
  return response.data;
}

export function startWorkDayRequest(
  organizationId: string,
  accessToken: string,
  location: AttendanceLocationInput | null,
): Promise<CurrentWorkDay> {
  return submitWorkDayActionRequest(organizationId, accessToken, "start", location);
}

export function endWorkDayRequest(
  organizationId: string,
  accessToken: string,
  location: AttendanceLocationInput | null,
): Promise<CurrentWorkDay> {
  return submitWorkDayActionRequest(organizationId, accessToken, "end", location);
}

export async function getLiveTechnicianLocationsRequest(
  organizationId: string,
  accessToken: string,
): Promise<LiveTechnicianLocation[]> {
  const response = await apiRequest<LiveTechnicianLocation[]>(
    `/organizations/${organizationId}/attendance/live-locations`,
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
