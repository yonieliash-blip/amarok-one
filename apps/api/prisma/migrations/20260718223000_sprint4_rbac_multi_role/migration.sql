-- Sprint 4 RBAC: allow multiple roles per user within an organization

DROP INDEX IF EXISTS "memberships_organizationId_userId_active_key";
DROP INDEX IF EXISTS "user_roles_organizationId_userId_active_key";

CREATE UNIQUE INDEX IF NOT EXISTS "user_roles_organizationId_userId_roleId_key"
  ON "user_roles"("organizationId", "userId", "roleId");
