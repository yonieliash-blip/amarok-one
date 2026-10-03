import type {
  EmployeeInspirationMessage,
  InspirationCurrent,
  InspirationEmployee,
  InspirationQuote,
} from "@amarok-one/types";
import { writeAuditLog } from "../../lib/audit.js";
import { forbidden, notFound } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import type {
  CreateInspirationQuoteInput,
  UpdateEmployeeInspirationInput,
  UpdateInspirationQuoteInput,
  UpsertEmployeeInspirationInput,
} from "./inspiration.schemas.js";

const activeMemberWhere = {
  deletedAt: null,
  status: "ACTIVE" as const,
  user: { deletedAt: null, isActive: true },
};

function toQuote(row: {
  id: string;
  organizationId: string;
  text: string;
  author: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): InspirationQuote {
  return {
    id: row.id,
    organizationId: row.organizationId,
    text: row.text,
    author: row.author ?? undefined,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toEmployeeMessage(row: {
  id: string;
  organizationId: string;
  userId: string;
  text: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: { displayName: string; organizationMembers: Array<{ id: string }> };
}): EmployeeInspirationMessage {
  const memberId = row.user.organizationMembers[0]?.id;
  if (!memberId) throw new Error("Active employee membership expected");
  return {
    id: row.id,
    organizationId: row.organizationId,
    memberId,
    userId: row.userId,
    employeeName: row.user.displayName,
    text: row.text,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function assertActiveMember(organizationId: string, userId: string): Promise<void> {
  const member = await prisma.organizationMember.findFirst({
    where: { organizationId, userId, ...activeMemberWhere },
    select: { id: true },
  });
  if (!member) throw forbidden("Active organization membership required");
}

async function memberUserId(organizationId: string, memberId: string): Promise<string> {
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId, ...activeMemberWhere },
    select: { userId: true },
  });
  if (!member) throw notFound("Active organization member", memberId);
  return member.userId;
}

const messageInclude = {
  user: {
    select: {
      displayName: true,
      organizationMembers: { where: { deletedAt: null, status: "ACTIVE" }, select: { id: true } },
    },
  },
} as const;

export function createInspirationService() {
  async function getCurrent(organizationId: string, userId: string): Promise<InspirationCurrent> {
    await assertActiveMember(organizationId, userId);
    const personal = await prisma.employeeInspirationMessage.findFirst({
      where: { organizationId, userId, isActive: true },
      select: { text: true },
    });
    if (personal) return { kind: "personal", text: personal.text };

    const quotes = await prisma.inspirationQuote.findMany({
      where: { organizationId, isActive: true },
      select: { text: true, author: true },
      orderBy: { createdAt: "asc" },
    });
    if (!quotes.length) return { kind: "none" };
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    return { kind: "general", text: quote!.text, author: quote!.author ?? undefined };
  }

  async function listEmployees(organizationId: string): Promise<InspirationEmployee[]> {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId, ...activeMemberWhere },
      select: {
        id: true,
        userId: true,
        user: { select: { displayName: true } },
        primaryRole: { select: { name: true } },
      },
      orderBy: { user: { displayName: "asc" } },
    });
    return members.map((member) => ({
      memberId: member.id,
      userId: member.userId,
      displayName: member.user.displayName,
      roleName: member.primaryRole.name,
    }));
  }

  async function listQuotes(organizationId: string): Promise<InspirationQuote[]> {
    const rows = await prisma.inspirationQuote.findMany({
      where: { organizationId },
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    });
    return rows.map(toQuote);
  }

  async function createQuote(
    organizationId: string,
    actorId: string,
    input: CreateInspirationQuoteInput,
  ): Promise<InspirationQuote> {
    const row = await prisma.inspirationQuote.create({
      data: { organizationId, text: input.text, author: input.author, createdById: actorId },
    });
    await writeAuditLog({
      organizationId,
      actorId,
      action: "inspiration_quote.created",
      entityType: "InspirationQuote",
      entityId: row.id,
    });
    return toQuote(row);
  }

  async function updateQuote(
    organizationId: string,
    quoteId: string,
    actorId: string,
    input: UpdateInspirationQuoteInput,
  ): Promise<InspirationQuote> {
    const existing = await prisma.inspirationQuote.findFirst({
      where: { id: quoteId, organizationId },
      select: { id: true },
    });
    if (!existing) throw notFound("Inspiration quote", quoteId);
    const row = await prisma.inspirationQuote.update({
      where: { id: quoteId },
      data: {
        ...(input.text !== undefined ? { text: input.text } : {}),
        ...(input.author !== undefined ? { author: input.author } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    await writeAuditLog({
      organizationId,
      actorId,
      action: "inspiration_quote.updated",
      entityType: "InspirationQuote",
      entityId: row.id,
      metadata: { fields: Object.keys(input) },
    });
    return toQuote(row);
  }

  async function listEmployeeMessages(
    organizationId: string,
  ): Promise<EmployeeInspirationMessage[]> {
    const rows = await prisma.employeeInspirationMessage.findMany({
      where: { organizationId },
      include: messageInclude,
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    });
    return rows.map(toEmployeeMessage);
  }

  async function upsertEmployeeMessage(
    organizationId: string,
    memberId: string,
    actorId: string,
    input: UpsertEmployeeInspirationInput,
  ): Promise<EmployeeInspirationMessage> {
    const userId = await memberUserId(organizationId, memberId);
    const row = await prisma.employeeInspirationMessage.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      create: {
        organizationId,
        userId,
        text: input.text,
        isActive: input.isActive ?? true,
        createdById: actorId,
      },
      update: { text: input.text, isActive: input.isActive ?? true, createdById: actorId },
      include: messageInclude,
    });
    await writeAuditLog({
      organizationId,
      actorId,
      action: "employee_inspiration.upserted",
      entityType: "EmployeeInspirationMessage",
      entityId: row.id,
      metadata: { employeeId: userId, isActive: row.isActive },
    });
    return toEmployeeMessage(row);
  }

  async function updateEmployeeMessage(
    organizationId: string,
    memberId: string,
    actorId: string,
    input: UpdateEmployeeInspirationInput,
  ): Promise<EmployeeInspirationMessage> {
    const userId = await memberUserId(organizationId, memberId);
    const existing = await prisma.employeeInspirationMessage.findFirst({
      where: { organizationId, userId },
      select: { id: true },
    });
    if (!existing) throw notFound("Employee inspiration message", memberId);
    const row = await prisma.employeeInspirationMessage.update({
      where: { id: existing.id },
      data: { isActive: input.isActive },
      include: messageInclude,
    });
    await writeAuditLog({
      organizationId,
      actorId,
      action: "employee_inspiration.updated",
      entityType: "EmployeeInspirationMessage",
      entityId: row.id,
      metadata: { employeeId: userId, isActive: row.isActive },
    });
    return toEmployeeMessage(row);
  }

  return {
    getCurrent,
    listEmployees,
    listQuotes,
    createQuote,
    updateQuote,
    listEmployeeMessages,
    upsertEmployeeMessage,
    updateEmployeeMessage,
  };
}

export type InspirationService = ReturnType<typeof createInspirationService>;
