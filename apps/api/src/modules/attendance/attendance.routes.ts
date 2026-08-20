import { zValidator } from "@hono/zod-validator";
import { createApiResponse } from "@amarok-one/utils";
import { Hono } from "hono";
import { getAuth } from "../../lib/auth-context.js";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import {
  attendanceParamsSchema,
  attendancePeriodParamsSchema,
  clockActionSchema,
  monthlyAttendanceQuerySchema,
  correctWorkDaySchema,
  workDayParamsSchema,
  unlockAttendancePeriodSchema,
  workDayLocationsSchema,
} from "./attendance.schemas.js";
import {
  endBreak,
  endWorkDay,
  getCurrentWorkDay,
  getMonthlyAttendanceReport,
  getWorkDayLocations,
  startBreak,
  startWorkDay,
  approveWorkDay,
  correctWorkDay,
  lockAttendancePeriod,
  unlockAttendancePeriod,
  recordWorkDayLocations,
} from "./attendance.service.js";

function userId(context: Parameters<typeof getAuth>[0]): string {
  return getAuth(context).user.sub;
}

export const attendanceRoutes = new Hono()
  .use("*", tenantGuard)
  .get(
    "/reports/monthly",
    requirePermission("attendance:read"),
    zValidator("param", attendanceParamsSchema),
    zValidator("query", monthlyAttendanceQuerySchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const { month } = context.req.valid("query");
      return context.json(
        createApiResponse(await getMonthlyAttendanceReport(organizationId, month)),
      );
    },
  )
  .patch(
    "/work-days/:workDayId",
    requirePermission("attendance:write"),
    zValidator("param", workDayParamsSchema),
    zValidator("json", correctWorkDaySchema),
    async (context) => {
      const { organizationId, workDayId } = context.req.valid("param");
      return context.json(
        createApiResponse(
          await correctWorkDay(
            organizationId,
            workDayId,
            userId(context),
            context.req.valid("json"),
          ),
        ),
      );
    },
  )
  .get(
    "/work-days/:workDayId/locations",
    requirePermission("attendance:read"),
    zValidator("param", workDayParamsSchema),
    async (context) => {
      const { organizationId, workDayId } = context.req.valid("param");
      return context.json(createApiResponse(await getWorkDayLocations(organizationId, workDayId)));
    },
  )
  .post(
    "/periods/:month/lock",
    requirePermission("attendance:write"),
    zValidator("param", attendancePeriodParamsSchema),
    async (context) => {
      const { organizationId, month } = context.req.valid("param");
      return context.json(
        createApiResponse(await lockAttendancePeriod(organizationId, month, userId(context))),
      );
    },
  )
  .post(
    "/periods/:month/unlock",
    requirePermission("attendance:write"),
    zValidator("param", attendancePeriodParamsSchema),
    zValidator("json", unlockAttendancePeriodSchema),
    async (context) => {
      const { organizationId, month } = context.req.valid("param");
      return context.json(
        createApiResponse(
          await unlockAttendancePeriod(
            organizationId,
            month,
            userId(context),
            context.req.valid("json"),
          ),
        ),
      );
    },
  )
  .post(
    "/work-days/:workDayId/approve",
    requirePermission("attendance:write"),
    zValidator("param", workDayParamsSchema),
    async (context) => {
      const { organizationId, workDayId } = context.req.valid("param");
      return context.json(
        createApiResponse(await approveWorkDay(organizationId, workDayId, userId(context))),
      );
    },
  )
  .get(
    "/current",
    requirePermission("my_attendance:read"),
    zValidator("param", attendanceParamsSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      return context.json(
        createApiResponse(await getCurrentWorkDay(organizationId, userId(context))),
      );
    },
  )
  .post(
    "/locations/batch",
    requirePermission("my_attendance:write"),
    zValidator("param", attendanceParamsSchema),
    zValidator("json", workDayLocationsSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      return context.json(
        createApiResponse(
          await recordWorkDayLocations(organizationId, userId(context), context.req.valid("json")),
        ),
        201,
      );
    },
  )
  .post(
    "/start",
    requirePermission("my_attendance:write"),
    zValidator("param", attendanceParamsSchema),
    zValidator("json", clockActionSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      return context.json(
        createApiResponse(
          await startWorkDay(organizationId, userId(context), context.req.valid("json")),
        ),
        201,
      );
    },
  )
  .post(
    "/end",
    requirePermission("my_attendance:write"),
    zValidator("param", attendanceParamsSchema),
    zValidator("json", clockActionSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      return context.json(
        createApiResponse(
          await endWorkDay(organizationId, userId(context), context.req.valid("json")),
        ),
      );
    },
  )
  .post(
    "/breaks/start",
    requirePermission("my_attendance:write"),
    zValidator("param", attendanceParamsSchema),
    zValidator("json", clockActionSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      return context.json(
        createApiResponse(
          await startBreak(organizationId, userId(context), context.req.valid("json")),
        ),
        201,
      );
    },
  )
  .post(
    "/breaks/end",
    requirePermission("my_attendance:write"),
    zValidator("param", attendanceParamsSchema),
    zValidator("json", clockActionSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      return context.json(
        createApiResponse(
          await endBreak(organizationId, userId(context), context.req.valid("json")),
        ),
      );
    },
  );
