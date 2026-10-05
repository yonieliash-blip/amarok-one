import type { Task, TaskPriority, TaskStatus } from "@amarok-one/types";
import {
  Prisma,
  TaskPriority as TaskPriorityModel,
  TaskStatus as TaskStatusModel,
} from "@prisma/client";
import { writeAuditLog } from "../../lib/audit.js";
import { forbidden, notFound } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { assertOrganizationExists } from "../organizations/organization.service.js";
import type { CreateTaskInput, UpdateTaskInput } from "./task.schemas.js";

const statusToModel: Record<TaskStatus, TaskStatusModel> = {
  open: "OPEN",
  in_progress: "IN_PROGRESS",
  waiting: "WAITING",
  completed: "COMPLETED",
};

const statusToDto: Record<TaskStatusModel, TaskStatus> = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  WAITING: "waiting",
  COMPLETED: "completed",
};

const priorityToModel: Record<TaskPriority, TaskPriorityModel> = {
  low: "LOW",
  normal: "NORMAL",
  high: "HIGH",
  urgent: "URGENT",
};

const priorityToDto: Record<TaskPriorityModel, TaskPriority> = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
};

const taskInclude = {
  assignedTo: { select: { id: true, displayName: true, email: true } },
  createdBy: { select: { id: true, displayName: true, email: true } },
  completedBy: { select: { id: true, displayName: true, email: true } },
} satisfies Prisma.TaskInclude;

type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

function toTaskDto(row: TaskRow): Task {
  return {
    id: row.id,
    organizationId: row.organizationId,
    title: row.title,
    description: row.description ?? undefined,
    status: statusToDto[row.status],
    priority: priorityToDto[row.priority],
    dueAt: row.dueAt?.toISOString(),
    assignedToId: row.assignedToId,
    assignedTo: row.assignedTo,
    createdBy: row.createdBy ?? undefined,
    completedAt: row.completedAt?.toISOString(),
    completedBy: row.completedBy ?? undefined,
    completionNote: row.completionNote ?? undefined,
    linkUrl: row.linkUrl ?? undefined,
    linkedEntityType: row.linkedEntityType ?? undefined,
    linkedEntityId: row.linkedEntityId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolveAssigneeUserId(
  organizationId: string,
  candidateId: string,
): Promise<string> {
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      OR: [{ userId: candidateId }, { id: candidateId }],
      deletedAt: null,
      status: "ACTIVE",
      user: { deletedAt: null, isActive: true },
    },
    select: { userId: true },
  });
  if (!member) throw notFound("Active organization member", candidateId);
  return member.userId;
}

export async function listTaskAssignees(organizationId: string) {
  await assertOrganizationExists(organizationId);
  return prisma.organizationMember
    .findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: "ACTIVE",
        user: { deletedAt: null, isActive: true },
      },
      select: { user: { select: { id: true, displayName: true, email: true } } },
      orderBy: { user: { displayName: "asc" } },
    })
    .then((rows) => rows.map((row) => row.user));
}

export async function listTasks(input: {
  organizationId: string;
  actorId: string;
  canManage: boolean;
  status?: TaskStatus;
  assignedToId?: string;
  dueOn?: string;
}): Promise<Task[]> {
  await assertOrganizationExists(input.organizationId);
  const dueOn = input.dueOn ? new Date(`${input.dueOn}T00:00:00.000Z`) : undefined;
  const nextDay = dueOn ? new Date(dueOn.getTime() + 24 * 60 * 60 * 1000) : undefined;
  const rows = await prisma.task.findMany({
    where: {
      organizationId: input.organizationId,
      assignedToId: input.canManage ? input.assignedToId : input.actorId,
      ...(input.status ? { status: statusToModel[input.status] } : {}),
      ...(dueOn && nextDay ? { dueAt: { gte: dueOn, lt: nextDay } } : {}),
    },
    include: taskInclude,
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toTaskDto);
}

export async function createTask(
  organizationId: string,
  actorId: string,
  input: CreateTaskInput,
): Promise<Task> {
  await assertOrganizationExists(organizationId);
  const assignedToId = await resolveAssigneeUserId(organizationId, input.assignedToId);
  const task = await prisma.task.create({
    data: {
      organizationId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      assignedToId,
      createdById: actorId,
      priority: priorityToModel[input.priority],
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      linkUrl: input.linkUrl?.trim() || null,
      linkedEntityType: input.linkedEntityType?.trim() || null,
      linkedEntityId: input.linkedEntityId ?? null,
    },
    include: taskInclude,
  });
  await writeAuditLog({
    organizationId,
    actorId,
    action: "task.created",
    entityType: "Task",
    entityId: task.id,
    metadata: { assignedToId: task.assignedToId, priority: task.priority },
  });
  return toTaskDto(task);
}

export async function updateTask(input: {
  organizationId: string;
  taskId: string;
  actorId: string;
  canManage: boolean;
  values: UpdateTaskInput;
}): Promise<Task> {
  const existing = await prisma.task.findFirst({
    where: { id: input.taskId, organizationId: input.organizationId },
    include: taskInclude,
  });
  if (!existing) throw notFound("Task", input.taskId);
  if (!input.canManage && existing.assignedToId !== input.actorId) {
    throw forbidden("Only the assignee may update this task");
  }
  if (
    !input.canManage &&
    Object.keys(input.values).some((key) => !["status", "completionNote"].includes(key))
  ) {
    throw forbidden("Only a task manager may change task details");
  }
  const assignedToId = input.values.assignedToId
    ? await resolveAssigneeUserId(input.organizationId, input.values.assignedToId)
    : undefined;

  const nextStatus = input.values.status ? statusToModel[input.values.status] : existing.status;
  const isCompleting = nextStatus === "COMPLETED" && existing.status !== "COMPLETED";
  const isReopening = nextStatus !== "COMPLETED" && existing.status === "COMPLETED";
  const task = await prisma.task.update({
    where: { id: existing.id },
    data: {
      title: input.values.title?.trim(),
      description:
        input.values.description === undefined
          ? undefined
          : input.values.description?.trim() || null,
      assignedToId,
      priority: input.values.priority ? priorityToModel[input.values.priority] : undefined,
      dueAt:
        input.values.dueAt === undefined
          ? undefined
          : input.values.dueAt
            ? new Date(input.values.dueAt)
            : null,
      status: input.values.status ? statusToModel[input.values.status] : undefined,
      completionNote:
        input.values.completionNote === undefined
          ? undefined
          : input.values.completionNote?.trim() || null,
      linkUrl:
        input.values.linkUrl === undefined ? undefined : input.values.linkUrl?.trim() || null,
      completedAt: isCompleting ? new Date() : isReopening ? null : undefined,
      completedById: isCompleting ? input.actorId : isReopening ? null : undefined,
    },
    include: taskInclude,
  });
  await writeAuditLog({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: isCompleting ? "task.completed" : isReopening ? "task.reopened" : "task.updated",
    entityType: "Task",
    entityId: task.id,
    metadata: { status: task.status, assignedToId: task.assignedToId },
  });
  return toTaskDto(task);
}
