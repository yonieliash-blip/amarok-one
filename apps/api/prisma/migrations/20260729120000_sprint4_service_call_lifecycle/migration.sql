-- Sprint 4: service call lifecycle + visits

CREATE TYPE "ServiceCallLifecycleState" AS ENUM (
  'NEW',
  'WAITING_ASSIGNMENT',
  'ASSIGNED',
  'DRIVING',
  'WORKING',
  'WAITING_FOR_PARTS',
  'WAITING_CUSTOMER',
  'WAITING_SPECIALIST',
  'WAITING_MANAGER_CLOSURE',
  'CLOSED'
);

CREATE TYPE "ServiceCallVisitStatus" AS ENUM (
  'PLANNED',
  'ASSIGNED',
  'DRIVING',
  'WORKING',
  'FINISHED',
  'CANCELLED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED'
);

ALTER TABLE "service_calls"
ADD COLUMN "lifecycleState" "ServiceCallLifecycleState" NOT NULL DEFAULT 'NEW';

CREATE INDEX "service_calls_organizationId_lifecycleState_idx"
ON "service_calls" ("organizationId", "lifecycleState");

CREATE TABLE "service_call_visits" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "serviceCallId" UUID NOT NULL,
  "technicianId" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "status" "ServiceCallVisitStatus" NOT NULL DEFAULT 'ASSIGNED',
  "scheduledStart" TIMESTAMP(3),
  "scheduledEnd" TIMESTAMP(3),
  "drivingStartedAt" TIMESTAMP(3),
  "workingStartedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "service_call_visits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_call_visits_serviceCallId_sequence_key"
ON "service_call_visits" ("serviceCallId", "sequence");

CREATE INDEX "service_call_visits_organizationId_idx"
ON "service_call_visits" ("organizationId");

CREATE INDEX "service_call_visits_organizationId_serviceCallId_idx"
ON "service_call_visits" ("organizationId", "serviceCallId");

CREATE INDEX "service_call_visits_organizationId_technicianId_idx"
ON "service_call_visits" ("organizationId", "technicianId");

CREATE INDEX "service_call_visits_organizationId_deletedAt_idx"
ON "service_call_visits" ("organizationId", "deletedAt");

ALTER TABLE "service_call_visits"
ADD CONSTRAINT "service_call_visits_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service_call_visits"
ADD CONSTRAINT "service_call_visits_serviceCallId_fkey"
FOREIGN KEY ("serviceCallId") REFERENCES "service_calls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service_call_visits"
ADD CONSTRAINT "service_call_visits_technicianId_fkey"
FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing rows enter the dispatch queue.
UPDATE "service_calls"
SET "lifecycleState" = 'WAITING_ASSIGNMENT'
WHERE "lifecycleState" = 'NEW'
  AND "deletedAt" IS NULL;
