import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  endWorkDay,
  getMonthlyAttendanceReport,
  startBreak,
  startWorkDay,
} from "./attendance.service.js";

const mocks = vi.hoisted(() => ({
  workDayFindFirst: vi.fn(),
  workDayFindMany: vi.fn(),
  workDayCreate: vi.fn(),
  workDayUpdate: vi.fn(),
  workBreakFindFirst: vi.fn(),
  workBreakCreate: vi.fn(),
  workBreakUpdateMany: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    workDay: {
      findFirst: mocks.workDayFindFirst,
      findMany: mocks.workDayFindMany,
      create: mocks.workDayCreate,
      update: mocks.workDayUpdate,
    },
    workBreak: {
      findFirst: mocks.workBreakFindFirst,
      create: mocks.workBreakCreate,
      updateMany: mocks.workBreakUpdateMany,
    },
  },
}));
vi.mock("../../lib/audit.js", () => ({ writeAuditLog: mocks.audit }));

const org = "11111111-1111-4111-8111-111111111111";
const user = "22222222-2222-4222-8222-222222222222";
const emptyLocation = {
  startLatitude: null,
  startLongitude: null,
  endLatitude: null,
  endLongitude: null,
};

describe("attendance.service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a second active work day for the same tenant user", async () => {
    mocks.workDayFindFirst.mockResolvedValue({ id: "day-1", ...emptyLocation, breaks: [] });
    await expect(startWorkDay(org, user, {})).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.workDayCreate).not.toHaveBeenCalled();
  });

  it("uses server time and stores the reported start location", async () => {
    mocks.workDayFindFirst.mockResolvedValue(null);
    mocks.workDayCreate.mockImplementation(async ({ data }) => ({
      id: "day-1",
      ...data,
      ...emptyLocation,
      breaks: [],
    }));
    await startWorkDay(org, user, {
      location: { latitude: 32.0853, longitude: 34.7818, accuracy: 8 },
    });
    expect(mocks.workDayCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: org,
          userId: user,
          startLatitude: 32.0853,
          startLongitude: 34.7818,
          startAccuracy: 8,
          startedAt: expect.any(Date),
        }),
      }),
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "attendance.work_day_started", actorId: user }),
    );
  });

  it("ends an active break when the employee ends the work day", async () => {
    mocks.workDayFindFirst.mockResolvedValue({ id: "day-1" });
    mocks.workDayUpdate.mockResolvedValue({ id: "day-1", ...emptyLocation, breaks: [] });
    await endWorkDay(org, user, {});
    expect(mocks.workBreakUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: org, workDayId: "day-1", status: "ACTIVE" },
        data: expect.objectContaining({ status: "COMPLETED", endedAt: expect.any(Date) }),
      }),
    );
  });

  it("does not start a break without an active work day", async () => {
    mocks.workDayFindFirst.mockResolvedValue(null);
    await expect(startBreak(org, user, {})).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("calculates monthly gross, break and net minutes per employee", async () => {
    mocks.workDayFindMany.mockResolvedValue([
      {
        id: "day-1",
        userId: user,
        status: "COMPLETED",
        startedAt: new Date("2026-08-10T05:00:00.000Z"),
        endedAt: new Date("2026-08-10T14:00:00.000Z"),
        startLatitude: 32,
        endLatitude: 32,
        user: { displayName: "Dana", email: "dana@example.com" },
        breaks: [
          {
            startedAt: new Date("2026-08-10T09:00:00.000Z"),
            endedAt: new Date("2026-08-10T09:30:00.000Z"),
          },
        ],
      },
    ]);

    const report = await getMonthlyAttendanceReport(org, "2026-08", new Date("2026-08-31"));
    expect(report).toMatchObject({
      employeeCount: 1,
      totalWorkDays: 1,
      totalNetMinutes: 510,
      employees: [{ displayName: "Dana", grossMinutes: 540, breakMinutes: 30, netMinutes: 510 }],
    });
    expect(mocks.workDayFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: org, startedAt: expect.any(Object) }),
      }),
    );
  });
});
