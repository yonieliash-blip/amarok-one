import { zValidator } from "@hono/zod-validator";
import { createApiResponse } from "@amarok-one/utils";
import { Hono } from "hono";
import { getAuth } from "../../lib/auth-context.js";
import { requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import {
  attendanceParamsSchema,
  clockActionSchema,
  monthlyAttendanceQuerySchema,
} from "./attendance.schemas.js";
import {
  endBreak,
  endWorkDay,
  getCurrentWorkDay,
  getMonthlyAttendanceReport,
  startBreak,
  startWorkDay,
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
