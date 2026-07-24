import { hasAllPermissions, hasAnyPermission } from "@amarok-one/permissions";
import { createMiddleware } from "hono/factory";
import { forbidden } from "../lib/errors.js";

export function requirePermission(...permissions: string[]) {
  return requireAnyPermission(...permissions);
}

export function requireAnyPermission(...permissions: string[]) {
  return createMiddleware(async (context, next) => {
    const auth = context.get("auth");

    if (!hasAnyPermission(auth.user.permissions, permissions)) {
      throw forbidden("Insufficient permissions");
    }

    await next();
  });
}

export function requireAllPermissions(...permissions: string[]) {
  return createMiddleware(async (context, next) => {
    const auth = context.get("auth");

    if (!hasAllPermissions(auth.user.permissions, permissions)) {
      throw forbidden("Insufficient permissions");
    }

    await next();
  });
}
