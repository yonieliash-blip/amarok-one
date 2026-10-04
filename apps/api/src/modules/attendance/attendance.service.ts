import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { writeAuditLog } from "../../lib/audit.js";
import type {
  ClockActionInput,
  CorrectWorkDayInput,
  UnlockAttendancePeriodInput,
  WorkDayLocationsInput,
} from "./attendance.schemas.js";

function locationData(prefix: "start" | "end", input: ClockActionInput) {
  const location = input.location;
  if (!location) return {};
  return {
    [`${prefix}Latitude`]: location.latitude,
    [`${prefix}Longitude`]: location.longitude,
    [`${prefix}Accuracy`]: location.accuracy,
  };
}

function serializeWorkDay<
  T extends {
    startLatitude: unknown;
    startLongitude: unknown;
    endLatitude: unknown;
    endLongitude: unknown;
  },
>(row: T) {
  return {
    ...row,
    startLatitude: row.startLatitude === null ? null : Number(row.startLatitude),
    startLongitude: row.startLongitude === null ? null : Number(row.startLongitude),
    endLatitude: row.endLatitude === null ? null : Number(row.endLatitude),
    endLongitude: row.endLongitude === null ? null : Number(row.endLongitude),
  };
}

const includeBreaks = { breaks: { orderBy: { startedAt: "asc" as const } } };

const ISRAEL_TIME_ZONE = "Asia/Jerusalem";
const SYSTEM_ACTIVITY_GRACE_MINUTES = 5;
const ACTIVITY_SAMPLE_MIN_INTERVAL_MS = 60_000;

function israelMidnightUtc(year: number, monthIndex: number, day: number): Date {
  const guess = Date.UTC(year, monthIndex, day);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(guess));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const displayedAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return new Date(guess - (displayedAsUtc - guess));
}

function monthRange(month: string): { from: Date; to: Date } {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  return {
    from: israelMidnightUtc(year, monthNumber - 1, 1),
    to: israelMidnightUtc(year, monthNumber, 1),
  };
}

function dayRange(date: string): { from: Date; to: Date } {
  const [year, monthNumber, day] = date.split("-").map(Number) as [number, number, number];
  return {
    from: israelMidnightUtc(year, monthNumber - 1, day),
    to: israelMidnightUtc(year, monthNumber - 1, day + 1),
  };
}

function israelMonth(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

async function assertAttendancePeriodOpen(organizationId: string, date: Date): Promise<void> {
  const lock = await prisma.attendancePeriodLock.findFirst({
    where: { organizationId, month: israelMonth(date), unlockedAt: null },
  });
  if (lock) throw conflict("The attendance month is locked");
}

function durationMinutes(startedAt: Date, endedAt: Date | null, now: Date): number {
  return Math.max(0, Math.round(((endedAt ?? now).getTime() - startedAt.getTime()) / 60_000));
}

type TimedBreak = { startedAt: Date; endedAt: Date | null };
type TimedActivity = { recordedAt: Date };

/**
 * Inactivity is deliberately limited to AMAROK ONE interaction. The report retains
 * paid/net time and separately highlights gaps longer than five minutes, excluding
 * declared breaks. It must not be read as a measurement of computer or work activity.
 */
function systemInactiveMinutes(
  startedAt: Date,
  endedAt: Date | null,
  breaks: TimedBreak[],
  activitySamples: TimedActivity[],
  now: Date,
): number {
  const workEnd = endedAt ?? now;
  if (workEnd <= startedAt) return 0;

  const sortedBreaks = breaks
    .map((entry) => ({
      start: entry.startedAt < startedAt ? startedAt : entry.startedAt,
      end: (entry.endedAt ?? workEnd) > workEnd ? workEnd : (entry.endedAt ?? workEnd),
    }))
    .filter((entry) => entry.end > entry.start)
    .sort((left, right) => left.start.getTime() - right.start.getTime());
  const intervals: Array<{ start: Date; end: Date }> = [];
  let cursor = startedAt;
  for (const entry of sortedBreaks) {
    if (entry.end <= cursor) continue;
    if (entry.start > cursor) intervals.push({ start: cursor, end: entry.start });
    if (entry.end > cursor) cursor = entry.end;
  }
  if (cursor < workEnd) intervals.push({ start: cursor, end: workEnd });

  const samples = [...activitySamples].sort(
    (left, right) => left.recordedAt.getTime() - right.recordedAt.getTime(),
  );
  const graceMs = SYSTEM_ACTIVITY_GRACE_MINUTES * 60_000;
  let inactiveMs = 0;
  for (const interval of intervals) {
    let inactiveFrom = new Date(interval.start.getTime() + graceMs);
    for (const sample of samples) {
      if (sample.recordedAt <= interval.start || sample.recordedAt >= interval.end) continue;
      if (sample.recordedAt > inactiveFrom) {
        inactiveMs += sample.recordedAt.getTime() - inactiveFrom.getTime();
      }
      inactiveFrom = new Date(sample.recordedAt.getTime() + graceMs);
    }
    if (inactiveFrom < interval.end) inactiveMs += interval.end.getTime() - inactiveFrom.getTime();
  }
  return Math.max(0, Math.round(inactiveMs / 60_000));
}

export async function getMonthlyAttendanceReport(
  organizationId: string,
  month: string,
  now = new Date(),
) {
  const { from, to } = monthRange(month);
  const [rows, periodLock] = await Promise.all([
    prisma.workDay.findMany({
      where: { organizationId, startedAt: { gte: from, lt: to } },
      include: {
        user: true,
        breaks: { orderBy: { startedAt: "asc" } },
        activitySamples: { select: { recordedAt: true }, orderBy: { recordedAt: "asc" } },
        _count: { select: { locations: true } },
      },
      orderBy: [{ user: { displayName: "asc" } }, { startedAt: "asc" }],
    }),
    prisma.attendancePeriodLock.findFirst({ where: { organizationId, month } }),
  ]);

  const employees = new Map<
    string,
    {
      userId: string;
      displayName: string;
      email: string;
      workDays: number;
      grossMinutes: number;
      breakMinutes: number;
      netMinutes: number;
      systemInactiveMinutes: number;
      days: Array<{
        id: string;
        status: string;
        reviewStatus: string;
        approvedAt: Date | null;
        startedAt: Date;
        endedAt: Date | null;
        grossMinutes: number;
        breakMinutes: number;
        netMinutes: number;
        systemInactiveMinutes: number;
        activitySampleCount: number;
        locationCaptured: boolean;
        locationSampleCount: number;
      }>;
    }
  >();

  for (const row of rows) {
    const grossMinutes = durationMinutes(row.startedAt, row.endedAt, now);
    const breakMinutes = row.breaks.reduce(
      (total, entry) => total + durationMinutes(entry.startedAt, entry.endedAt, now),
      0,
    );
    const netMinutes = Math.max(0, grossMinutes - breakMinutes);
    const inactiveMinutes = systemInactiveMinutes(
      row.startedAt,
      row.endedAt,
      row.breaks,
      row.activitySamples,
      now,
    );
    const employee = employees.get(row.userId) ?? {
      userId: row.userId,
      displayName: row.user.displayName,
      email: row.user.email,
      workDays: 0,
      grossMinutes: 0,
      breakMinutes: 0,
      netMinutes: 0,
      systemInactiveMinutes: 0,
      days: [],
    };
    employee.workDays += 1;
    employee.grossMinutes += grossMinutes;
    employee.breakMinutes += breakMinutes;
    employee.netMinutes += netMinutes;
    employee.systemInactiveMinutes += inactiveMinutes;
    employee.days.push({
      id: row.id,
      status: row.status,
      reviewStatus: row.reviewStatus,
      approvedAt: row.approvedAt,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      grossMinutes,
      breakMinutes,
      netMinutes,
      systemInactiveMinutes: inactiveMinutes,
      activitySampleCount: row.activitySamples.length,
      locationCaptured: Boolean(row.startLatitude || row.endLatitude || row._count.locations),
      locationSampleCount: row._count.locations,
    });
    employees.set(row.userId, employee);
  }

  const employeeRows = Array.from(employees.values());
  return {
    month,
    timeZone: ISRAEL_TIME_ZONE,
    employeeCount: employeeRows.length,
    totalWorkDays: employeeRows.reduce((sum, employee) => sum + employee.workDays, 0),
    totalNetMinutes: employeeRows.reduce((sum, employee) => sum + employee.netMinutes, 0),
    totalSystemInactiveMinutes: employeeRows.reduce(
      (sum, employee) => sum + employee.systemInactiveMinutes,
      0,
    ),
    locked: Boolean(periodLock && !periodLock.unlockedAt),
    periodLock,
    employees: employeeRows,
  };
}

/**
 * Returns one operational workday view, grouped by each employee's current
 * primary role. Only explicitly reported breaks are counted as non-working
 * time; AMAROK ONE activity is reported separately and never changes payable hours.
 */
export async function getDailyAttendanceReport(
  organizationId: string,
  date: string,
  now = new Date(),
) {
  const { from, to } = dayRange(date);
  const rows = await prisma.workDay.findMany({
    where: { organizationId, startedAt: { gte: from, lt: to } },
    include: {
      user: {
        select: {
          displayName: true,
          email: true,
          organizationMembers: {
            where: { organizationId, status: "ACTIVE", deletedAt: null },
            select: { primaryRole: { select: { slug: true, name: true } } },
            take: 1,
          },
        },
      },
      breaks: { orderBy: { startedAt: "asc" } },
      activitySamples: { select: { recordedAt: true }, orderBy: { recordedAt: "asc" } },
      _count: { select: { locations: true } },
    },
    orderBy: [{ user: { displayName: "asc" } }, { startedAt: "asc" }],
  });

  const employees = new Map<
    string,
    {
      userId: string;
      displayName: string;
      email: string;
      role: { slug: string; name: string } | null;
      workDays: number;
      grossMinutes: number;
      breakMinutes: number;
      netMinutes: number;
      systemInactiveMinutes: number;
      days: Array<{
        id: string;
        status: string;
        reviewStatus: string;
        approvedAt: Date | null;
        startedAt: Date;
        endedAt: Date | null;
        grossMinutes: number;
        breakMinutes: number;
        netMinutes: number;
        systemInactiveMinutes: number;
        activitySampleCount: number;
        locationCaptured: boolean;
        locationSampleCount: number;
      }>;
    }
  >();

  for (const row of rows) {
    const grossMinutes = durationMinutes(row.startedAt, row.endedAt, now);
    const breakMinutes = row.breaks.reduce(
      (total, entry) => total + durationMinutes(entry.startedAt, entry.endedAt, now),
      0,
    );
    const netMinutes = Math.max(0, grossMinutes - breakMinutes);
    const inactiveMinutes = systemInactiveMinutes(
      row.startedAt,
      row.endedAt,
      row.breaks,
      row.activitySamples,
      now,
    );
    const role = row.user.organizationMembers[0]?.primaryRole ?? null;
    const employee = employees.get(row.userId) ?? {
      userId: row.userId,
      displayName: row.user.displayName,
      email: row.user.email,
      role,
      workDays: 0,
      grossMinutes: 0,
      breakMinutes: 0,
      netMinutes: 0,
      systemInactiveMinutes: 0,
      days: [],
    };
    employee.workDays += 1;
    employee.grossMinutes += grossMinutes;
    employee.breakMinutes += breakMinutes;
    employee.netMinutes += netMinutes;
    employee.systemInactiveMinutes += inactiveMinutes;
    employee.days.push({
      id: row.id,
      status: row.status,
      reviewStatus: row.reviewStatus,
      approvedAt: row.approvedAt,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      grossMinutes,
      breakMinutes,
      netMinutes,
      systemInactiveMinutes: inactiveMinutes,
      activitySampleCount: row.activitySamples.length,
      locationCaptured: Boolean(row.startLatitude || row.endLatitude || row._count.locations),
      locationSampleCount: row._count.locations,
    });
    employees.set(row.userId, employee);
  }

  const employeeRows = Array.from(employees.values());
  return {
    date,
    timeZone: ISRAEL_TIME_ZONE,
    employeeCount: employeeRows.length,
    totalWorkDays: employeeRows.reduce((sum, employee) => sum + employee.workDays, 0),
    totalGrossMinutes: employeeRows.reduce((sum, employee) => sum + employee.grossMinutes, 0),
    totalBreakMinutes: employeeRows.reduce((sum, employee) => sum + employee.breakMinutes, 0),
    totalNetMinutes: employeeRows.reduce((sum, employee) => sum + employee.netMinutes, 0),
    totalSystemInactiveMinutes: employeeRows.reduce(
      (sum, employee) => sum + employee.systemInactiveMinutes,
      0,
    ),
    employees: employeeRows,
  };
}

export async function getWorkDayLocations(organizationId: string, workDayId: string) {
  const workDay = await prisma.workDay.findFirst({ where: { organizationId, id: workDayId } });
  if (!workDay) throw notFound("Work day", workDayId);
  const points = await prisma.workDayLocation.findMany({
    where: { organizationId, workDayId },
    orderBy: { recordedAt: "asc" },
  });
  return points.map((point) => ({
    ...point,
    latitude: Number(point.latitude),
    longitude: Number(point.longitude),
  }));
}

/** Returns only technicians with an active work day and their latest stored point. */
export async function getLiveTechnicianLocations(organizationId: string) {
  const rows = await prisma.workDay.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      user: {
        isActive: true,
        deletedAt: null,
        organizationMembers: {
          some: {
            organizationId,
            status: "ACTIVE",
            deletedAt: null,
            primaryRole: { slug: "technician", deletedAt: null },
          },
        },
      },
    },
    select: {
      id: true,
      startedAt: true,
      startLatitude: true,
      startLongitude: true,
      startAccuracy: true,
      user: { select: { id: true, displayName: true } },
      locations: {
        select: { recordedAt: true, latitude: true, longitude: true, accuracy: true },
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { startedAt: "asc" },
  });

  return rows.map((row) => {
    const latest = row.locations[0];
    const hasClockInLocation = row.startLatitude !== null && row.startLongitude !== null;
    return {
      workDayId: row.id,
      userId: row.user.id,
      displayName: row.user.displayName,
      startedAt: row.startedAt,
      lastUpdatedAt: latest?.recordedAt ?? row.startedAt,
      lastKnownLocation: latest
        ? {
            latitude: Number(latest.latitude),
            longitude: Number(latest.longitude),
            accuracy: latest.accuracy,
            source: "tracking" as const,
          }
        : hasClockInLocation
          ? {
              latitude: Number(row.startLatitude),
              longitude: Number(row.startLongitude),
              accuracy: row.startAccuracy,
              source: "clock_in" as const,
            }
          : null,
    };
  });
}

export async function lockAttendancePeriod(organizationId: string, month: string, actorId: string) {
  const { from, to } = monthRange(month);
  const existingLock = await prisma.attendancePeriodLock.findFirst({
    where: { organizationId, month, unlockedAt: null },
  });
  if (existingLock) return existingLock;

  const rows = await prisma.workDay.findMany({
    where: { organizationId, startedAt: { gte: from, lt: to } },
    select: { id: true, status: true, endedAt: true, reviewStatus: true },
  });
  if (rows.length === 0) throw badRequest("A month without attendance records cannot be locked");
  if (rows.some((row) => row.status === "ACTIVE" || !row.endedAt)) {
    throw badRequest("All work days must be completed before locking the month");
  }
  if (rows.some((row) => row.reviewStatus !== "APPROVED")) {
    throw badRequest("All work days must be approved before locking the month");
  }

  const lockedAt = new Date();
  const lock = await prisma.attendancePeriodLock.upsert({
    where: { organizationId_month: { organizationId, month } },
    create: { organizationId, month, lockedAt, lockedById: actorId },
    update: {
      lockedAt,
      lockedById: actorId,
      unlockedAt: null,
      unlockedById: null,
      unlockReason: null,
    },
  });
  await writeAuditLog({
    organizationId,
    actorId,
    action: "attendance.period_locked",
    entityType: "AttendancePeriodLock",
    entityId: lock.id,
    metadata: { month, workDayCount: rows.length },
  });
  return lock;
}

export async function unlockAttendancePeriod(
  organizationId: string,
  month: string,
  actorId: string,
  input: UnlockAttendancePeriodInput,
) {
  const lock = await prisma.attendancePeriodLock.findFirst({
    where: { organizationId, month, unlockedAt: null },
  });
  if (!lock) throw notFound("Active attendance period lock");
  const unlockedAt = new Date();
  const updated = await prisma.attendancePeriodLock.update({
    where: { id: lock.id },
    data: { unlockedAt, unlockedById: actorId, unlockReason: input.reason },
  });
  await writeAuditLog({
    organizationId,
    actorId,
    action: "attendance.period_unlocked",
    entityType: "AttendancePeriodLock",
    entityId: lock.id,
    metadata: { month, reason: input.reason },
  });
  return updated;
}

export async function correctWorkDay(
  organizationId: string,
  workDayId: string,
  actorId: string,
  input: CorrectWorkDayInput,
) {
  const existing = await prisma.workDay.findFirst({
    where: { organizationId, id: workDayId },
  });
  if (!existing) throw notFound("Work day", workDayId);
  await assertAttendancePeriodOpen(organizationId, existing.startedAt);
  await assertAttendancePeriodOpen(organizationId, new Date(input.startedAt));
  const before = {
    startedAt: existing.startedAt.toISOString(),
    endedAt: existing.endedAt?.toISOString() ?? null,
    reviewStatus: existing.reviewStatus,
  };
  const updated = await prisma.workDay.update({
    where: { id: workDayId },
    data: {
      startedAt: new Date(input.startedAt),
      endedAt: new Date(input.endedAt),
      status: "COMPLETED",
      reviewStatus: "PENDING",
      approvedAt: null,
      approvedById: null,
    },
    include: includeBreaks,
  });
  await writeAuditLog({
    organizationId,
    actorId,
    action: "attendance.work_day_corrected",
    entityType: "WorkDay",
    entityId: workDayId,
    metadata: {
      reason: input.reason,
      before,
      after: { startedAt: input.startedAt, endedAt: input.endedAt, reviewStatus: "PENDING" },
    },
  });
  return serializeWorkDay(updated);
}

export async function approveWorkDay(organizationId: string, workDayId: string, actorId: string) {
  const existing = await prisma.workDay.findFirst({
    where: { organizationId, id: workDayId },
  });
  if (!existing) throw notFound("Work day", workDayId);
  await assertAttendancePeriodOpen(organizationId, existing.startedAt);
  if (existing.status !== "COMPLETED" || !existing.endedAt) {
    throw badRequest("An active work day cannot be approved");
  }
  if (existing.reviewStatus === "APPROVED") return existing;
  const approvedAt = new Date();
  const updated = await prisma.workDay.update({
    where: { id: workDayId },
    data: { reviewStatus: "APPROVED", approvedAt, approvedById: actorId },
    include: includeBreaks,
  });
  await writeAuditLog({
    organizationId,
    actorId,
    action: "attendance.work_day_approved",
    entityType: "WorkDay",
    entityId: workDayId,
    metadata: { approvedAt: approvedAt.toISOString(), employeeId: existing.userId },
  });
  return serializeWorkDay(updated);
}

export async function getCurrentWorkDay(organizationId: string, userId: string) {
  const row = await prisma.workDay.findFirst({
    where: { organizationId, userId, status: "ACTIVE" },
    include: includeBreaks,
    orderBy: { startedAt: "desc" },
  });
  return row ? serializeWorkDay(row) : null;
}

export async function recordWorkDayLocations(
  organizationId: string,
  userId: string,
  input: WorkDayLocationsInput,
) {
  const workDay = await prisma.workDay.findFirst({
    where: { organizationId, userId, status: "ACTIVE" },
  });
  if (!workDay) throw notFound("Active work day");

  const latestAllowed = Date.now() + 5 * 60_000;
  const points = input.points.map((point) => ({
    ...point,
    recordedAt: new Date(point.recordedAt),
  }));
  if (
    points.some(
      (point) => point.recordedAt < workDay.startedAt || point.recordedAt.getTime() > latestAllowed,
    )
  ) {
    throw badRequest("Location timestamps must fall within the active work day");
  }

  const result = await prisma.workDayLocation.createMany({
    data: points.map((point) => ({
      organizationId,
      workDayId: workDay.id,
      recordedAt: point.recordedAt,
      latitude: point.latitude,
      longitude: point.longitude,
      accuracy: point.accuracy,
    })),
    skipDuplicates: true,
  });
  await writeAuditLog({
    organizationId,
    actorId: userId,
    action: "attendance.locations_recorded",
    entityType: "WorkDay",
    entityId: workDay.id,
    metadata: { acceptedCount: result.count, submittedCount: points.length },
  });
  return { acceptedCount: result.count };
}

/** Records at most one AMAROK ONE interaction heartbeat per active minute. */
export async function recordWorkDayActivity(organizationId: string, userId: string) {
  const workDay = await prisma.workDay.findFirst({
    where: { organizationId, userId, status: "ACTIVE" },
  });
  if (!workDay) throw notFound("Active work day");

  const recordedAt = new Date();
  const latest = await prisma.workDayActivitySample.findFirst({
    where: {
      organizationId,
      workDayId: workDay.id,
      recordedAt: { gte: new Date(recordedAt.getTime() - ACTIVITY_SAMPLE_MIN_INTERVAL_MS) },
    },
    orderBy: { recordedAt: "desc" },
  });
  if (latest) return { accepted: false };

  await prisma.workDayActivitySample.create({
    data: { organizationId, workDayId: workDay.id, recordedAt },
  });
  return { accepted: true };
}

export async function startWorkDay(
  organizationId: string,
  userId: string,
  input: ClockActionInput,
) {
  await assertAttendancePeriodOpen(organizationId, new Date());
  if (await getCurrentWorkDay(organizationId, userId)) {
    throw conflict("A work day is already active");
  }
  const row = await prisma.workDay.create({
    data: { organizationId, userId, startedAt: new Date(), ...locationData("start", input) },
    include: includeBreaks,
  });
  await writeAuditLog({
    organizationId,
    actorId: userId,
    action: "attendance.work_day_started",
    entityType: "WorkDay",
    entityId: row.id,
    metadata: { locationCaptured: Boolean(input.location) },
  });
  return serializeWorkDay(row);
}

export async function endWorkDay(organizationId: string, userId: string, input: ClockActionInput) {
  const active = await prisma.workDay.findFirst({
    where: { organizationId, userId, status: "ACTIVE" },
  });
  if (!active) throw notFound("Active work day");
  const endedAt = new Date();
  await prisma.workBreak.updateMany({
    where: { organizationId, workDayId: active.id, status: "ACTIVE" },
    data: { status: "COMPLETED", endedAt, ...locationData("end", input) },
  });
  const row = await prisma.workDay.update({
    where: { id: active.id },
    data: { status: "COMPLETED", endedAt, ...locationData("end", input) },
    include: includeBreaks,
  });
  await writeAuditLog({
    organizationId,
    actorId: userId,
    action: "attendance.work_day_ended",
    entityType: "WorkDay",
    entityId: row.id,
    metadata: { locationCaptured: Boolean(input.location) },
  });
  return serializeWorkDay(row);
}

export async function startBreak(organizationId: string, userId: string, input: ClockActionInput) {
  const day = await prisma.workDay.findFirst({
    where: { organizationId, userId, status: "ACTIVE" },
  });
  if (!day) throw notFound("Active work day");
  const existing = await prisma.workBreak.findFirst({
    where: { organizationId, workDayId: day.id, status: "ACTIVE" },
  });
  if (existing) throw conflict("A break is already active");
  const entry = await prisma.workBreak.create({
    data: {
      organizationId,
      workDayId: day.id,
      startedAt: new Date(),
      ...locationData("start", input),
    },
  });
  await writeAuditLog({
    organizationId,
    actorId: userId,
    action: "attendance.break_started",
    entityType: "WorkBreak",
    entityId: entry.id,
    metadata: { workDayId: day.id, locationCaptured: Boolean(input.location) },
  });
  return getCurrentWorkDay(organizationId, userId);
}

export async function endBreak(organizationId: string, userId: string, input: ClockActionInput) {
  const day = await prisma.workDay.findFirst({
    where: { organizationId, userId, status: "ACTIVE" },
  });
  if (!day) throw notFound("Active work day");
  const active = await prisma.workBreak.findFirst({
    where: { organizationId, workDayId: day.id, status: "ACTIVE" },
  });
  if (!active) throw notFound("Active break");
  await prisma.workBreak.update({
    where: { id: active.id },
    data: { status: "COMPLETED", endedAt: new Date(), ...locationData("end", input) },
  });
  await writeAuditLog({
    organizationId,
    actorId: userId,
    action: "attendance.break_ended",
    entityType: "WorkBreak",
    entityId: active.id,
    metadata: { workDayId: day.id, locationCaptured: Boolean(input.location) },
  });
  return getCurrentWorkDay(organizationId, userId);
}
