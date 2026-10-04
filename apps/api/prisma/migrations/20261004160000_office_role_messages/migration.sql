-- Office staff need the internal chat and the daily inspiration greeting.
-- This only changes role grants; it does not modify customer, service-call, or financial data.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), role."id", permission."id", CURRENT_TIMESTAMP
FROM "roles" AS role
JOIN "permissions" AS permission ON permission."slug" IN ('messages:read', 'messages:write')
WHERE role."slug" = 'accounting'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- The office workspace intentionally exposes only its dedicated workflow.
DELETE FROM "role_permissions"
WHERE "roleId" IN (SELECT "id" FROM "roles" WHERE "slug" = 'accounting')
  AND "permissionId" IN (
    SELECT "id" FROM "permissions" WHERE "slug" IN ('purchase_orders:read', 'reports:read')
  );
