-- CreateEnum
CREATE TYPE "ServiceCallStatus" AS ENUM ('OPEN', 'SCHEDULED', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceCallPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "service_calls" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "serviceCallNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ServiceCallStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "ServiceCallPriority" NOT NULL DEFAULT 'NORMAL',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "customerId" UUID NOT NULL,
    "equipmentId" UUID NOT NULL,
    "branchId" UUID,
    "assignedUserId" UUID,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "service_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_calls_organizationId_idx" ON "service_calls"("organizationId");

-- CreateIndex
CREATE INDEX "service_calls_organizationId_deletedAt_idx" ON "service_calls"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "service_calls_organizationId_status_idx" ON "service_calls"("organizationId", "status");

-- CreateIndex
CREATE INDEX "service_calls_organizationId_priority_idx" ON "service_calls"("organizationId", "priority");

-- CreateIndex
CREATE INDEX "service_calls_organizationId_customerId_idx" ON "service_calls"("organizationId", "customerId");

-- CreateIndex
CREATE INDEX "service_calls_organizationId_equipmentId_idx" ON "service_calls"("organizationId", "equipmentId");

-- CreateIndex
CREATE INDEX "service_calls_organizationId_assignedUserId_idx" ON "service_calls"("organizationId", "assignedUserId");

-- CreateIndex
CREATE INDEX "service_calls_organizationId_openedAt_idx" ON "service_calls"("organizationId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "service_calls_organizationId_serviceCallNumber_key" ON "service_calls"("organizationId", "serviceCallNumber");

-- AddForeignKey
ALTER TABLE "service_calls" ADD CONSTRAINT "service_calls_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_calls" ADD CONSTRAINT "service_calls_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_calls" ADD CONSTRAINT "service_calls_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_calls" ADD CONSTRAINT "service_calls_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_calls" ADD CONSTRAINT "service_calls_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
