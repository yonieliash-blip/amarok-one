CREATE TABLE "work_day_locations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workDayId" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_day_locations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "work_day_locations_workDayId_recordedAt_key" ON "work_day_locations"("workDayId", "recordedAt");
CREATE INDEX "work_day_locations_organizationId_workDayId_recordedAt_idx" ON "work_day_locations"("organizationId", "workDayId", "recordedAt");
ALTER TABLE "work_day_locations" ADD CONSTRAINT "work_day_locations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_day_locations" ADD CONSTRAINT "work_day_locations_workDayId_fkey" FOREIGN KEY ("workDayId") REFERENCES "work_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
