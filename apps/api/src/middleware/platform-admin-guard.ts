import { isPlatformAdmin } from "@amarok-one/permissions";
import { createMiddleware } from "hono/factory";
import { forbidden } from "../lib/errors.js";

/** Requires explicit platform administrator authorization for cross-tenant operations. */
export function requirePlatformAdmin() {
  return createMiddleware(async (context, next) => {
    const auth = context.get("auth");

    if (!isPlatformAdmin(auth.user.permissions)) {
      throw forbidden("Platform administrator privileges required");
    }

    await next();
  });
}
