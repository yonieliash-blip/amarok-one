import { conflict, notFound } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { writeAuditLog } from "../../lib/audit.js";
import type { ClockActionInput } from "./attendance.schemas.js";

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

export async function getCurrentWorkDay(organizationId: string, userId: string) {
  const row = await prisma.workDay.findFirst({
    where: { organizationId, userId, status: "ACTIVE" },
    include: includeBreaks,
    orderBy: { startedAt: "desc" },
  });
  return row ? serializeWorkDay(row) : null;
}

export async function startWorkDay(
  organizationId: string,
  userId: string,
  input: ClockActionInput,
) {
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
