import { createApiResponse } from "@amarok-one/utils";
import { zValidator } from "@hono/zod-validator";
import { Hono, type Context } from "hono";
import { getAuth } from "../../lib/auth-context.js";
import { requireAnyPermission, requirePermission } from "../../middleware/jwt-guard.js";
import { tenantGuard } from "../../middleware/tenant-guard.js";
import { organizationIdParamSchema } from "../organizations/organization.schemas.js";
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  updateTaskSchema,
} from "./task.schemas.js";
import { createTask, listTaskAssignees, listTasks, updateTask } from "./task.service.js";

function canManage(context: Context): boolean {
  return getAuth(context).user.permissions.includes("tasks:manage");
}

export const tasksRoutes = new Hono()
  .use("*", tenantGuard)
  .get(
    "/",
    requireAnyPermission("tasks:read", "tasks:manage"),
    zValidator("param", organizationIdParamSchema),
    zValidator("query", listTasksQuerySchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      const query = context.req.valid("query");
      const auth = getAuth(context).user;
      return context.json(
        createApiResponse(
          await listTasks({
            organizationId,
            actorId: auth.sub,
            canManage: canManage(context),
            status: query.status,
            assignedToId: query.assignedToId,
            dueOn: query.dueOn,
          }),
        ),
      );
    },
  )
  .get(
    "/assignees",
    requirePermission("tasks:manage"),
    zValidator("param", organizationIdParamSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      return context.json(createApiResponse(await listTaskAssignees(organizationId)));
    },
  )
  .post(
    "/",
    requirePermission("tasks:manage"),
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createTaskSchema),
    async (context) => {
      const { organizationId } = context.req.valid("param");
      return context.json(
        createApiResponse(
          await createTask(organizationId, getAuth(context).user.sub, context.req.valid("json")),
        ),
        201,
      );
    },
  )
  .patch(
    "/:taskId",
    requireAnyPermission("tasks:write", "tasks:manage"),
    zValidator("param", taskIdParamSchema),
    zValidator("json", updateTaskSchema),
    async (context) => {
      const { organizationId, taskId } = context.req.valid("param");
      const auth = getAuth(context).user;
      return context.json(
        createApiResponse(
          await updateTask({
            organizationId,
            taskId,
            actorId: auth.sub,
            canManage: canManage(context),
            values: context.req.valid("json"),
          }),
        ),
      );
    },
  );
