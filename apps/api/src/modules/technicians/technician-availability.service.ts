import type { TechnicianAvailability } from "@amarok-one/types";
import type { Prisma } from "@prisma/client";
import { writeAuditLog } from "../../lib/audit.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import type {
  AvailabilityRangeQuery,
  UpdateTechnicianAvailabilityInput,
} from "./technician-availability.schemas.js";

const DEFAULT_VISIT_DURATION_MS = 60 * 60 * 1000;
const MAX_VISIT_DURATION_MS = 24 * 60 * 60 * 1000;
const BUSINESS_TIME_ZONE = "Asia/Jerusalem";

type Tx = Prisma.TransactionClient;

function toUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function businessDate(value: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item) => item.type === type)?.value ?? "";
  return toUtcDate(`${part("year")}-${part("month")}-${part("day")}`);
}

function toAvailabilityDto(row: {
  id: string;
  organizationId: string;
  technicianId: string;
  date: Date;
  status: "AVAILABLE" | "UNAVAILABLE";
  note: string | null;
  updatedAt: Date;
}): TechnicianAvailability {
  return {
    id: row.id,
    organizationId: row.organizationId,
    technicianId: row.technicianId,
    date: row.date.toISOString().slice(0, 10),
    status: row.status === "UNAVAILABLE" ? "unavailable" : "available",
    note: row.note ?? undefined,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireActiveTechnician(
  organizationId: string,
  technicianMemberId: string,
): Promise<{ id: string; userId: string; displayName: string }> {
  const member = await prisma.organizationMember.findFirst({
    where: {
      id: technicianMemberId,
      organizationId,
      deletedAt: null,
      status: "ACTIVE",
      primaryRole: { slug: "technician", deletedAt: null },
      user: { deletedAt: null, isActive: true },
    },
    include: { user: { select: { id: true, displayName: true } } },
  });
  if (!member) throw notFound("Active technician", technicianMemberId);
  return { id: member.id, userId: member.userId, displayName: member.user.displayName };
}

export async function listTechnicianAvailability(
  organizationId: string,
  range: AvailabilityRangeQuery,
): Promise<TechnicianAvailability[]> {
  const rows = await prisma.technicianAvailability.findMany({
    where: {
      organizationId,
      date: { gte: toUtcDate(range.from), lte: toUtcDate(range.to) },
    },
    orderBy: [{ date: "asc" }, { technician: { displayName: "asc" } }],
  });
  return rows.map(toAvailabilityDto);
}

export async function listMyTechnicianAvailability(
  organizationId: string,
  technicianId: string,
  range: AvailabilityRangeQuery,
): Promise<TechnicianAvailability[]> {
  const rows = await prisma.technicianAvailability.findMany({
    where: {
      organizationId,
      technicianId,
      date: { gte: toUtcDate(range.from), lte: toUtcDate(range.to) },
    },
    orderBy: { date: "asc" },
  });
  return rows.map(toAvailabilityDto);
}

export async function setTechnicianAvailability(
  organizationId: string,
  technicianMemberId: string,
  date: string,
  input: UpdateTechnicianAvailabilityInput,
  actorId: string,
): Promise<TechnicianAvailability> {
  const technician = await requireActiveTechnician(organizationId, technicianMemberId);
  const row = await prisma.technicianAvailability.upsert({
    where: {
      organizationId_technicianId_date: {
        organizationId,
        technicianId: technician.userId,
        date: toUtcDate(date),
      },
    },
    create: {
      organizationId,
      technicianId: technician.userId,
      date: toUtcDate(date),
      status: input.status === "unavailable" ? "UNAVAILABLE" : "AVAILABLE",
      note: input.note?.trim() || null,
    },
    update: {
      status: input.status === "unavailable" ? "UNAVAILABLE" : "AVAILABLE",
      note: input.note?.trim() || null,
    },
  });

  await writeAuditLog({
    organizationId,
    actorId,
    action: "technician.availability.updated",
    entityType: "TechnicianAvailability",
    entityId: row.id,
    metadata: {
      technicianId: technician.userId,
      technicianName: technician.displayName,
      date,
      status: input.status,
    },
  });

  return toAvailabilityDto(row);
}

/**
 * Prevents a dispatcher from booking a technician marked unavailable or into
 * an overlapping active visit. It runs inside the scheduling transaction.
 */
export async function assertTechnicianCanBeScheduled(
  tx: Tx,
  input: {
    organizationId: string;
    technicianId: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    excludeVisitId?: string;
  },
): Promise<void> {
  if (!input.scheduledStart) return;

  const scheduledStart = new Date(input.scheduledStart);
  const scheduledEnd = input.scheduledEnd
    ? new Date(input.scheduledEnd)
    : new Date(scheduledStart.valueOf() + DEFAULT_VISIT_DURATION_MS);
  if (
    Number.isNaN(scheduledStart.valueOf()) ||
    Number.isNaN(scheduledEnd.valueOf()) ||
    scheduledEnd <= scheduledStart ||
    scheduledEnd.valueOf() - scheduledStart.valueOf() > MAX_VISIT_DURATION_MS
  ) {
    throw badRequest("טווח זמן הביקור אינו תקין.");
  }

  const date = businessDate(scheduledStart);
  const unavailable = await tx.technicianAvailability.findFirst({
    where: {
      organizationId: input.organizationId,
      technicianId: input.technicianId,
      date,
      status: "UNAVAILABLE",
    },
    select: { note: true },
  });
  if (unavailable) {
    throw badRequest(
      unavailable.note
        ? `הטכנאי אינו זמין ביום זה: ${unavailable.note}`
        : "הטכנאי אינו זמין ביום שנבחר.",
    );
  }

  const candidateStart = new Date(scheduledStart.valueOf() - MAX_VISIT_DURATION_MS);
  const visits = await tx.serviceCallVisit.findMany({
    where: {
      organizationId: input.organizationId,
      technicianId: input.technicianId,
      deletedAt: null,
      status: { notIn: ["FINISHED", "CANCELLED", "COMPLETED"] },
      scheduledStart: { gte: candidateStart, lt: scheduledEnd },
      ...(input.excludeVisitId ? { id: { not: input.excludeVisitId } } : {}),
    },
    select: { id: true, scheduledStart: true, scheduledEnd: true },
  });

  const overlaps = visits.some((visit) => {
    if (!visit.scheduledStart) return false;
    const visitEnd =
      visit.scheduledEnd ?? new Date(visit.scheduledStart.valueOf() + DEFAULT_VISIT_DURATION_MS);
    return visit.scheduledStart < scheduledEnd && visitEnd > scheduledStart;
  });
  if (overlaps) {
    throw badRequest("לטכנאי כבר קיים ביקור חופף בטווח הזמן שנבחר.");
  }
}
