CREATE TABLE "work_day_activity_samples" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workDayId" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_day_activity_samples_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "work_day_activity_samples_organizationId_workDayId_recordedAt_idx"
ON "work_day_activity_samples"("organizationId", "workDayId", "recordedAt");

ALTER TABLE "work_day_activity_samples"
ADD CONSTRAINT "work_day_activity_samples_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_day_activity_samples"
ADD CONSTRAINT "work_day_activity_samples_workDayId_fkey"
FOREIGN KEY ("workDayId") REFERENCES "work_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
