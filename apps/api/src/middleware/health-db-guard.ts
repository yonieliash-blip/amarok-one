import { createMiddleware } from "hono/factory";
import { env } from "../env.js";

/**
 * In production, /health/db requires X-Health-Token matching HEALTH_DB_TOKEN.
 * In non-production, the endpoint remains available for local diagnostics.
 */
export const healthDbGuard = createMiddleware(async (context, next) => {
  if (env.NODE_ENV !== "production") {
    await next();
    return;
  }

  const expected = env.HEALTH_DB_TOKEN;
  if (!expected) {
    return context.json(
      { code: "FORBIDDEN", message: "Database health diagnostics are disabled" },
      403,
    );
  }

  const provided = context.req.header("X-Health-Token")?.trim();
  if (!provided || provided !== expected) {
    return context.json({ code: "FORBIDDEN", message: "Forbidden" }, 403);
  }

  await next();
});
