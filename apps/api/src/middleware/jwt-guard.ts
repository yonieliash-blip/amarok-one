import { createMiddleware } from "hono/factory";
import { unauthorized } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/jwt.js";

export {
  requireAllPermissions,
  requireAnyPermission,
  requirePermission,
} from "./permission-guard.js";

export const jwtGuard = createMiddleware(async (context, next) => {
  const header = context.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw unauthorized("Missing or invalid Authorization header");
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw unauthorized("Missing access token");
  }

  try {
    const payload = await verifyAccessToken(token);
    if (!payload.roles?.length) {
      payload.roles = [
        {
          id: payload.roleId,
          slug: payload.roleSlug,
          name: payload.roleSlug,
        },
      ];
    }
    context.set("auth", { user: payload });
    await next();
  } catch {
    throw unauthorized("Invalid or expired access token");
  }
});
