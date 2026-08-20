CREATE TYPE "AttendanceReviewStatus" AS ENUM ('PENDING', 'APPROVED');

ALTER TABLE "work_days"
  ADD COLUMN "reviewStatus" "AttendanceReviewStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" UUID;

CREATE INDEX "work_days_organizationId_reviewStatus_idx" ON "work_days"("organizationId", "reviewStatus");
ALTER TABLE "work_days" ADD CONSTRAINT "work_days_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "slug", "name", "description", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'attendance:write', 'Write Attendance', 'Correct and approve employee attendance records', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r JOIN "permissions" p ON p."slug" = 'attendance:write'
WHERE r."slug" IN ('organization-owner', 'system-administrator', 'service-manager')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
