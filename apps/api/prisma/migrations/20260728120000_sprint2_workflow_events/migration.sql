-- CreateTable
CREATE TABLE "workflow_events" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "actorId" UUID,
    "correlationId" TEXT NOT NULL,
    "causationId" UUID,
    "sequence" INTEGER NOT NULL,
    "idempotencyKey" TEXT,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_events_organizationId_aggregateId_sequence_key" ON "workflow_events"("organizationId", "aggregateId", "sequence");

-- CreateIndex
CREATE INDEX "workflow_events_organizationId_aggregateId_idx" ON "workflow_events"("organizationId", "aggregateId");

-- CreateIndex
CREATE INDEX "workflow_events_organizationId_idempotencyKey_idx" ON "workflow_events"("organizationId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
