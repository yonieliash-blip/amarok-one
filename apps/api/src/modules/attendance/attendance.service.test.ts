import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  endWorkDay,
  correctWorkDay,
  getDailyAttendanceReport,
  getMonthlyAttendanceReport,
  getLiveTechnicianLocations,
  getWorkDayLocations,
  lockAttendancePeriod,
  recordWorkDayLocations,
  recordWorkDayActivity,
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
  attendancePeriodLockFindFirst: vi.fn(),
  attendancePeriodLockUpsert: vi.fn(),
  attendancePeriodLockUpdate: vi.fn(),
  workDayLocationCreateMany: vi.fn(),
  workDayLocationFindMany: vi.fn(),
  workDayActivitySampleFindFirst: vi.fn(),
  workDayActivitySampleCreate: vi.fn(),
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
    attendancePeriodLock: {
      findFirst: mocks.attendancePeriodLockFindFirst,
      upsert: mocks.attendancePeriodLockUpsert,
      update: mocks.attendancePeriodLockUpdate,
    },
    workDayLocation: {
      createMany: mocks.workDayLocationCreateMany,
      findMany: mocks.workDayLocationFindMany,
    },
    workDayActivitySample: {
      findFirst: mocks.workDayActivitySampleFindFirst,
      create: mocks.workDayActivitySampleCreate,
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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.attendancePeriodLockFindFirst.mockResolvedValue(null);
  });

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
        _count: { locations: 2 },
        activitySamples: [],
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

  it("groups the daily report by the employee primary role", async () => {
    mocks.workDayFindMany.mockResolvedValue([
      {
        id: "day-1",
        userId: user,
        status: "COMPLETED",
        reviewStatus: "PENDING",
        approvedAt: null,
        startedAt: new Date("2026-08-10T05:00:00.000Z"),
        endedAt: new Date("2026-08-10T14:00:00.000Z"),
        startLatitude: null,
        endLatitude: null,
        user: {
          displayName: "מור",
          email: "mor@example.com",
          organizationMembers: [{ primaryRole: { slug: "office", name: "ניהול משרד" } }],
        },
        _count: { locations: 0 },
        activitySamples: [],
        breaks: [
          {
            startedAt: new Date("2026-08-10T09:00:00.000Z"),
            endedAt: new Date("2026-08-10T09:30:00.000Z"),
          },
        ],
      },
    ]);

    const report = await getDailyAttendanceReport(
      org,
      "2026-08-10",
      new Date("2026-08-10T15:00:00.000Z"),
    );

    expect(report).toMatchObject({
      date: "2026-08-10",
      employeeCount: 1,
      totalGrossMinutes: 540,
      totalBreakMinutes: 30,
      totalNetMinutes: 510,
      employees: [
        {
          displayName: "מור",
          role: { slug: "office", name: "ניהול משרד" },
          grossMinutes: 540,
          breakMinutes: 30,
          netMinutes: 510,
        },
      ],
    });
    expect(mocks.workDayFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: org, startedAt: expect.any(Object) }),
      }),
    );
  });

  it("does not lock a month that contains an active work day", async () => {
    mocks.workDayFindMany.mockResolvedValue([
      { id: "day-1", status: "ACTIVE", endedAt: null, reviewStatus: "PENDING" },
    ]);
    await expect(lockAttendancePeriod(org, "2026-08", user)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(mocks.attendancePeriodLockUpsert).not.toHaveBeenCalled();
  });

  it("locks a month only after all work days are approved and audits it", async () => {
    mocks.workDayFindMany.mockResolvedValue([
      {
        id: "day-1",
        status: "COMPLETED",
        endedAt: new Date("2026-08-10T14:00:00.000Z"),
        reviewStatus: "APPROVED",
      },
    ]);
    mocks.attendancePeriodLockUpsert.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      organizationId: org,
      month: "2026-08",
    });
    await lockAttendancePeriod(org, "2026-08", user);
    expect(mocks.attendancePeriodLockUpsert).toHaveBeenCalled();
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "attendance.period_locked", actorId: user }),
    );
  });

  it("rejects corrections to a locked month", async () => {
    mocks.workDayFindFirst.mockResolvedValue({
      id: "day-1",
      startedAt: new Date("2026-08-10T05:00:00.000Z"),
      endedAt: new Date("2026-08-10T14:00:00.000Z"),
      reviewStatus: "APPROVED",
    });
    mocks.attendancePeriodLockFindFirst.mockResolvedValue({ id: "lock-1" });
    await expect(
      correctWorkDay(org, "day-1", user, {
        startedAt: "2026-08-10T05:10:00.000Z",
        endedAt: "2026-08-10T14:00:00.000Z",
        reason: "Manager correction",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.workDayUpdate).not.toHaveBeenCalled();
  });

  it("records sampled locations only against the employee's active work day", async () => {
    mocks.workDayFindFirst.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      startedAt: new Date("2026-08-20T05:00:00.000Z"),
    });
    mocks.workDayLocationCreateMany.mockResolvedValue({ count: 1 });
    const result = await recordWorkDayLocations(org, user, {
      points: [
        {
          recordedAt: "2026-08-20T06:00:00.000Z",
          latitude: 32.0853,
          longitude: 34.7818,
          accuracy: 20,
        },
      ],
    });
    expect(result).toEqual({ acceptedCount: 1 });
    expect(mocks.workDayLocationCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            organizationId: org,
            workDayId: "33333333-3333-4333-8333-333333333333",
          }),
        ],
        skipDuplicates: true,
      }),
    );
  });

  it("reports AMAROK-only inactivity separately from payable hours", async () => {
    mocks.workDayFindMany.mockResolvedValue([
      {
        id: "day-activity",
        userId: user,
        status: "COMPLETED",
        reviewStatus: "PENDING",
        approvedAt: null,
        startedAt: new Date("2026-08-10T05:00:00.000Z"),
        endedAt: new Date("2026-08-10T06:00:00.000Z"),
        startLatitude: null,
        endLatitude: null,
        user: {
          displayName: "מור",
          email: "mor@example.com",
          organizationMembers: [{ primaryRole: { slug: "office", name: "ניהול משרד" } }],
        },
        _count: { locations: 0 },
        breaks: [],
        activitySamples: [
          { recordedAt: new Date("2026-08-10T05:00:00.000Z") },
          { recordedAt: new Date("2026-08-10T05:30:00.000Z") },
        ],
      },
    ]);

    const report = await getDailyAttendanceReport(
      org,
      "2026-08-10",
      new Date("2026-08-10T06:00:00.000Z"),
    );

    expect(report).toMatchObject({
      totalNetMinutes: 60,
      totalSystemInactiveMinutes: 50,
      employees: [{ netMinutes: 60, systemInactiveMinutes: 50 }],
    });
  });

  it("accepts only one activity heartbeat per active minute", async () => {
    mocks.workDayFindFirst.mockResolvedValue({ id: "day-1" });
    mocks.workDayActivitySampleFindFirst.mockResolvedValue(null);
    mocks.workDayActivitySampleCreate.mockResolvedValue({ id: "sample-1" });

    await expect(recordWorkDayActivity(org, user)).resolves.toEqual({ accepted: true });
    expect(mocks.workDayActivitySampleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: org, workDayId: "day-1" }),
      }),
    );

    mocks.workDayActivitySampleFindFirst.mockResolvedValue({ id: "sample-1" });
    await expect(recordWorkDayActivity(org, user)).resolves.toEqual({ accepted: false });
    expect(mocks.workDayActivitySampleCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects location samples when no work day is active", async () => {
    mocks.workDayFindFirst.mockResolvedValue(null);
    await expect(
      recordWorkDayLocations(org, user, {
        points: [{ recordedAt: new Date().toISOString(), latitude: 32, longitude: 34 }],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns a tenant-scoped route for an existing work day", async () => {
    mocks.workDayFindFirst.mockResolvedValue({ id: "day-1" });
    mocks.workDayLocationFindMany.mockResolvedValue([
      { id: "point-1", latitude: "32.085300", longitude: "34.781800" },
    ]);
    const points = await getWorkDayLocations(org, "day-1");
    expect(points).toEqual([
      expect.objectContaining({ id: "point-1", latitude: 32.0853, longitude: 34.7818 }),
    ]);
    expect(mocks.workDayLocationFindMany).toHaveBeenCalledWith({
      where: { organizationId: org, workDayId: "day-1" },
      orderBy: { recordedAt: "asc" },
    });
  });

  it("returns the latest stored location only for active technicians in the tenant", async () => {
    mocks.workDayFindMany.mockResolvedValue([
      {
        id: "day-1",
        startedAt: new Date("2026-10-02T06:00:00.000Z"),
        startLatitude: "32.085300",
        startLongitude: "34.781800",
        startAccuracy: 10,
        user: { id: user, displayName: "Dana" },
        locations: [
          {
            recordedAt: new Date("2026-10-02T06:10:00.000Z"),
            latitude: "32.090000",
            longitude: "34.790000",
            accuracy: 18,
          },
        ],
      },
    ]);

    await expect(getLiveTechnicianLocations(org)).resolves.toEqual([
      expect.objectContaining({
        workDayId: "day-1",
        userId: user,
        displayName: "Dana",
        lastKnownLocation: {
          latitude: 32.09,
          longitude: 34.79,
          accuracy: 18,
          source: "tracking",
        },
      }),
    ]);
    expect(mocks.workDayFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: org, status: "ACTIVE" }),
      }),
    );
  });
});
