import { beforeEach, describe, expect, it, vi } from "vitest";
import { listTasks, updateTask } from "./task.service.js";

const mocks = vi.hoisted(() => ({
  taskFindMany: vi.fn(),
  taskFindFirst: vi.fn(),
  taskUpdate: vi.fn(),
  organizationMemberFindFirst: vi.fn(),
  audit: vi.fn(),
  assertOrganizationExists: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    task: {
      findMany: mocks.taskFindMany,
      findFirst: mocks.taskFindFirst,
      update: mocks.taskUpdate,
    },
    organizationMember: { findFirst: mocks.organizationMemberFindFirst },
  },
}));

vi.mock("../../lib/audit.js", () => ({ writeAuditLog: mocks.audit }));
vi.mock("../organizations/organization.service.js", () => ({
  assertOrganizationExists: mocks.assertOrganizationExists,
}));

const organizationId = "11111111-1111-4111-8111-111111111111";
const assigneeId = "22222222-2222-4222-8222-222222222222";
const otherUserId = "33333333-3333-4333-8333-333333333333";

describe("task.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertOrganizationExists.mockResolvedValue(undefined);
    mocks.taskFindMany.mockResolvedValue([]);
  });

  it("applies manager task filters inside the current organization", async () => {
    await listTasks({
      organizationId,
      actorId: otherUserId,
      canManage: true,
      assignedToId: assigneeId,
      status: "waiting",
      dueOn: "2026-10-05",
    });

    expect(mocks.taskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          assignedToId: assigneeId,
          status: "WAITING",
          dueAt: {
            gte: new Date("2026-10-05T00:00:00.000Z"),
            lt: new Date("2026-10-06T00:00:00.000Z"),
          },
        }),
      }),
    );
  });

  it("limits a worker list to that worker even when a different assignee is requested", async () => {
    await listTasks({
      organizationId,
      actorId: assigneeId,
      canManage: false,
      assignedToId: otherUserId,
    });

    expect(mocks.taskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId, assignedToId: assigneeId }),
      }),
    );
  });

  it("prevents a worker from updating someone else's task", async () => {
    mocks.taskFindFirst.mockResolvedValue({ id: "task-1", assignedToId: assigneeId });

    await expect(
      updateTask({
        organizationId,
        taskId: "task-1",
        actorId: otherUserId,
        canManage: false,
        values: { status: "completed" },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(mocks.taskUpdate).not.toHaveBeenCalled();
  });
});
