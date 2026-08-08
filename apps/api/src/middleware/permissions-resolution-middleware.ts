import { createMiddleware } from "hono/factory";
import type { AccessTokenPayload } from "../lib/jwt.js";
import { loadOrganizationMember, resolveMemberAuthorization } from "../lib/member-access.js";

/** Re-resolves effective permissions from DB on every authenticated request. */
export const permissionsResolutionMiddleware = createMiddleware(async (context, next) => {
  const auth = context.get("auth");
  const user = auth.user as AccessTokenPayload;

  const member = await loadOrganizationMember(user.organizationId, user.sub);
  if (!member) {
    await next();
    return;
  }

  const resolved = resolveMemberAuthorization(member);
  const refreshedUser: AccessTokenPayload = {
    ...user,
    roleId: member.primaryRoleId,
    roleSlug: member.primaryRole.slug,
    roles: [
      {
        id: member.primaryRole.id,
        slug: member.primaryRole.slug,
        name: member.primaryRole.name,
      },
    ],
    permissions: resolved.permissions,
    permissionsVersion: resolved.permissionsVersion,
    enabledModules: resolved.enabledModules,
    isOrganizationOwner: resolved.isOrganizationOwner,
  };

  context.set("auth", { user: refreshedUser });

  if (
    typeof user.permissionsVersion === "number" &&
    user.permissionsVersion !== resolved.permissionsVersion
  ) {
    context.header("X-Permissions-Version", String(resolved.permissionsVersion));
    context.header("X-Permissions-Stale", "true");
  }

  await next();
});
