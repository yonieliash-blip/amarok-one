-- Add manual repair-order parts without changing existing inventory-backed part rows.
ALTER TABLE "service_call_work_report_parts"
  ALTER COLUMN "inventoryItemId" DROP NOT NULL,
  ALTER COLUMN "catalogPartId" DROP NOT NULL,
  ADD COLUMN "manualName" TEXT,
  ADD COLUMN "manualPartNumber" TEXT;

ALTER TABLE "service_call_work_report_parts"
  ADD CONSTRAINT "service_call_work_report_parts_source_check"
  CHECK (
    ("inventoryItemId" IS NOT NULL AND "catalogPartId" IS NOT NULL AND "manualName" IS NULL)
    OR
    ("inventoryItemId" IS NULL AND "catalogPartId" IS NULL AND "manualName" IS NOT NULL)
  );

CREATE TABLE "service_call_work_report_attachments" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "workReportId" UUID NOT NULL,
  "category" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "service_call_work_report_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "service_call_work_report_attachments_storageKey_key" UNIQUE ("storageKey"),
  CONSTRAINT "service_call_work_report_attachments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "service_call_work_report_attachments_workReportId_fkey" FOREIGN KEY ("workReportId") REFERENCES "service_call_work_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "service_call_work_report_attachments_organizationId_workReportId_deletedAt_idx"
  ON "service_call_work_report_attachments"("organizationId", "workReportId", "deletedAt");
