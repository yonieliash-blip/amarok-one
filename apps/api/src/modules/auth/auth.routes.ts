import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createApiResponse } from "@amarok-one/utils";
import { getAuth } from "../../lib/auth-context.js";
import { jwtGuard } from "../../middleware/jwt-guard.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { loginSchema, logoutSchema, refreshTokenSchema, switchRoleSchema } from "./auth.schemas.js";
import { getCurrentUser, login, logout, refreshSession, switchRole } from "./auth.service.js";

const AUTH_RATE_LIMIT = rateLimit("auth", { windowMs: 60_000, max: 10 });

export const authRoutes = new Hono()
  .post("/login", AUTH_RATE_LIMIT, zValidator("json", loginSchema), async (context) => {
    const body = context.req.valid("json");
    const session = await login(body);
    return context.json(createApiResponse(session));
  })
  .post("/refresh", AUTH_RATE_LIMIT, zValidator("json", refreshTokenSchema), async (context) => {
    const body = context.req.valid("json");
    const session = await refreshSession(body);
    return context.json(createApiResponse(session));
  })
  .post("/logout", jwtGuard, async (context) => {
    const auth = getAuth(context);
    const raw = await context.req.json().catch(() => ({}));
    const body = logoutSchema.parse(raw);
    await logout(auth.user.sub, body);
    return context.body(null, 204);
  })
  .get("/me", jwtGuard, async (context) => {
    const auth = getAuth(context);
    const user = await getCurrentUser(auth.user.sub, auth.user.organizationId, auth.user.roleId);
    return context.json(createApiResponse(user));
  })
  .post("/switch-role", jwtGuard, zValidator("json", switchRoleSchema), async (context) => {
    const auth = getAuth(context);
    const body = context.req.valid("json");
    const session = await switchRole(auth.user.sub, auth.user.organizationId, body);
    return context.json(createApiResponse(session));
  });
