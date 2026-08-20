CREATE TYPE "WorkDayStatus" AS ENUM ('ACTIVE', 'COMPLETED');
CREATE TYPE "WorkBreakStatus" AS ENUM ('ACTIVE', 'COMPLETED');

CREATE TABLE "work_days" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "status" "WorkDayStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "startLatitude" DECIMAL(9,6),
  "startLongitude" DECIMAL(9,6),
  "startAccuracy" DOUBLE PRECISION,
  "endedAt" TIMESTAMP(3),
  "endLatitude" DECIMAL(9,6),
  "endLongitude" DECIMAL(9,6),
  "endAccuracy" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_days_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_breaks" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "workDayId" UUID NOT NULL,
  "status" "WorkBreakStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL,
  "startLatitude" DECIMAL(9,6),
  "startLongitude" DECIMAL(9,6),
  "startAccuracy" DOUBLE PRECISION,
  "endedAt" TIMESTAMP(3),
  "endLatitude" DECIMAL(9,6),
  "endLongitude" DECIMAL(9,6),
  "endAccuracy" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_breaks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "work_days_organizationId_userId_startedAt_idx" ON "work_days"("organizationId", "userId", "startedAt");
CREATE INDEX "work_days_organizationId_status_idx" ON "work_days"("organizationId", "status");
CREATE INDEX "work_breaks_organizationId_workDayId_idx" ON "work_breaks"("organizationId", "workDayId");
CREATE INDEX "work_breaks_organizationId_status_idx" ON "work_breaks"("organizationId", "status");

ALTER TABLE "work_days" ADD CONSTRAINT "work_days_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_days" ADD CONSTRAINT "work_days_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_breaks" ADD CONSTRAINT "work_breaks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_breaks" ADD CONSTRAINT "work_breaks_workDayId_fkey" FOREIGN KEY ("workDayId") REFERENCES "work_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PostgreSQL partial unique indexes prevent duplicate active days or breaks while allowing history.
CREATE UNIQUE INDEX "work_days_one_active_per_user" ON "work_days"("organizationId", "userId") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "work_breaks_one_active_per_day" ON "work_breaks"("organizationId", "workDayId") WHERE "status" = 'ACTIVE';

INSERT INTO "permissions" ("id", "slug", "name", "description", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'attendance:read', 'Read Attendance', 'View employee attendance records and reports', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'my_attendance:read', 'Read My Attendance', 'View personal attendance records', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'my_attendance:write', 'Write My Attendance', 'Start and end personal work days and breaks', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- Preserve the existing default-role model for installations that still resolve permissions through role grants.
INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON (
  (r."slug" IN ('organization-owner', 'system-administrator') AND p."slug" IN ('attendance:read', 'my_attendance:read', 'my_attendance:write')) OR
  (r."slug" IN ('service-manager', 'read-only') AND p."slug" = 'attendance:read') OR
  (r."slug" = 'technician' AND p."slug" IN ('my_attendance:read', 'my_attendance:write'))
)
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
