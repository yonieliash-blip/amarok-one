CREATE TABLE "attendance_period_locks" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedById" UUID NOT NULL,
    "unlockedAt" TIMESTAMP(3),
    "unlockedById" UUID,
    "unlockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_period_locks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_period_locks_organizationId_month_key"
    ON "attendance_period_locks"("organizationId", "month");
CREATE INDEX "attendance_period_locks_organizationId_unlockedAt_idx"
    ON "attendance_period_locks"("organizationId", "unlockedAt");

ALTER TABLE "attendance_period_locks"
    ADD CONSTRAINT "attendance_period_locks_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_period_locks"
    ADD CONSTRAINT "attendance_period_locks_lockedById_fkey"
    FOREIGN KEY ("lockedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_period_locks"
    ADD CONSTRAINT "attendance_period_locks_unlockedById_fkey"
    FOREIGN KEY ("unlockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
