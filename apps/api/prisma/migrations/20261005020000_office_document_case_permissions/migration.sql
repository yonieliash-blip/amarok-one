-- Grant document-case work permissions to every Accounting role.
-- This is additive only: it changes no schema and no business data.
-- Document approval remains restricted to managers and organization owners.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), role."id", permission."id", CURRENT_TIMESTAMP
FROM "roles" AS role
JOIN "permissions" AS permission
  ON permission."slug" IN (
    'document_cases:read',
    'document_cases:write',
    'document_cases:send'
  )
WHERE role."slug" = 'accounting'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
