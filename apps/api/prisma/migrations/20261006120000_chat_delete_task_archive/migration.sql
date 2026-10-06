-- Add manager-only conversation deletion and an explicit task archive marker.
ALTER TABLE "direct_conversations"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedById" UUID;

CREATE INDEX "direct_conversations_organizationId_deletedAt_idx"
  ON "direct_conversations"("organizationId", "deletedAt");

ALTER TABLE "tasks"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedById" UUID;

CREATE INDEX "tasks_organizationId_archivedAt_idx"
  ON "tasks"("organizationId", "archivedAt");

UPDATE "tasks"
SET "archivedAt" = COALESCE("completedAt", "updatedAt")
WHERE "status" = 'COMPLETED' AND "archivedAt" IS NULL;

INSERT INTO "permissions" ("id", "slug", "name", "description")
VALUES (gen_random_uuid(), 'messages:manage', 'Manage Messages', 'Delete organization conversations')
ON CONFLICT ("slug") DO UPDATE
SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";

INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), role."id", permission."id", CURRENT_TIMESTAMP
FROM "roles" AS role
JOIN "permissions" AS permission ON permission."slug" = 'messages:manage'
WHERE role."slug" IN ('system-administrator', 'organization-owner')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
