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
    const employee = employees.get(row.userId) ?? {
      userId: row.userId,
      displayName: row.user.displayName,
      email: row.user.email,
      workDays: 0,
      grossMinutes: 0,
      breakMinutes: 0,
      netMinutes: 0,
      days: [],
    };
    employee.workDays += 1;
    employee.grossMinutes += grossMinutes;
    employee.breakMinutes += breakMinutes;
    employee.netMinutes += netMinutes;
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
    locked: Boolean(periodLock && !periodLock.unlockedAt),
    periodLock,
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
