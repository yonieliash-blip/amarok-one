-- Additive, staging-review-only migration. It creates document-case metadata and audit links;
-- it does not touch existing customer, service-call, task, or external accounting data.
CREATE TYPE "DocumentCaseWorkflow" AS ENUM ('DIRECT_INVOICE', 'QUOTE_AND_PURCHASE_ORDER');
CREATE TYPE "DocumentCaseStatus" AS ENUM ('DRAFT', 'QUOTE_REVIEW_REQUIRED', 'QUOTE_CORRECTION_REQUIRED', 'QUOTE_SEND_REQUIRED', 'WAITING_PURCHASE_ORDER', 'INVOICE_REVIEW_REQUIRED', 'INVOICE_CORRECTION_REQUIRED', 'INVOICE_SEND_REQUIRED', 'ARCHIVED');
CREATE TYPE "DocumentCaseDocumentType" AS ENUM ('WORK_REPORT', 'QUOTE', 'PURCHASE_ORDER', 'INVOICE');
CREATE TYPE "DocumentVersionSource" AS ENUM ('METADATA_ONLY', 'EXISTING_WORK_REPORT');
CREATE TYPE "DocumentApprovalDecision" AS ENUM ('APPROVED', 'RETURNED_FOR_CORRECTION');
CREATE TYPE "DocumentDeliveryChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'OTHER');
CREATE TYPE "DocumentCaseTaskKind" AS ENUM ('MANAGER_REVIEW', 'SECRETARY_SEND', 'SECRETARY_PURCHASE_ORDER');

CREATE TABLE "document_cases" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "customerId" UUID NOT NULL,
  "repairReportNumber" TEXT NOT NULL, "workflow" "DocumentCaseWorkflow" NOT NULL,
  "status" "DocumentCaseStatus" NOT NULL DEFAULT 'DRAFT', "managerAssigneeId" UUID NOT NULL,
  "secretaryAssigneeId" UUID NOT NULL, "archivedAt" TIMESTAMP(3), "archivedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "document_cases_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "document_case_documents" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "documentCaseId" UUID NOT NULL,
  "type" "DocumentCaseDocumentType" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "document_case_documents_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "document_case_document_versions" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "documentId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL, "source" "DocumentVersionSource" NOT NULL DEFAULT 'METADATA_ONLY',
  "sourceWorkReportId" UUID, "displayName" TEXT NOT NULL, "externalDocumentNumber" TEXT,
  "documentDate" DATE, "note" TEXT, "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_case_document_versions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "document_case_approvals" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "documentCaseId" UUID NOT NULL,
  "documentVersionId" UUID NOT NULL, "decision" "DocumentApprovalDecision" NOT NULL, "note" TEXT,
  "decidedById" UUID NOT NULL, "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_case_approvals_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "document_case_deliveries" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "documentCaseId" UUID NOT NULL,
  "sentById" UUID NOT NULL, "recipientName" TEXT NOT NULL, "recipientEmail" TEXT,
  "recipientPhone" TEXT, "channel" "DocumentDeliveryChannel" NOT NULL, "note" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_case_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "document_case_delivery_items" (
  "id" UUID NOT NULL, "deliveryId" UUID NOT NULL, "documentVersionId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_case_delivery_items_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "document_case_task_links" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "documentCaseId" UUID NOT NULL,
  "taskId" UUID NOT NULL, "taskKind" "DocumentCaseTaskKind" NOT NULL, "documentVersionId" UUID,
  "deduplicationKey" TEXT NOT NULL, "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_case_task_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_cases_organizationId_repairReportNumber_key" ON "document_cases"("organizationId", "repairReportNumber");
CREATE INDEX "document_cases_organizationId_status_idx" ON "document_cases"("organizationId", "status");
CREATE INDEX "document_cases_organizationId_customerId_idx" ON "document_cases"("organizationId", "customerId");
CREATE INDEX "document_cases_organizationId_archivedAt_idx" ON "document_cases"("organizationId", "archivedAt");
CREATE UNIQUE INDEX "document_case_documents_documentCaseId_type_key" ON "document_case_documents"("documentCaseId", "type");
CREATE INDEX "document_case_documents_organizationId_documentCaseId_idx" ON "document_case_documents"("organizationId", "documentCaseId");
CREATE UNIQUE INDEX "document_case_document_versions_documentId_versionNumber_key" ON "document_case_document_versions"("documentId", "versionNumber");
CREATE INDEX "document_case_document_versions_organizationId_documentId_createdAt_idx" ON "document_case_document_versions"("organizationId", "documentId", "createdAt");
CREATE INDEX "document_case_document_versions_sourceWorkReportId_idx" ON "document_case_document_versions"("sourceWorkReportId");
CREATE UNIQUE INDEX "document_case_approvals_documentVersionId_key" ON "document_case_approvals"("documentVersionId");
CREATE INDEX "document_case_approvals_organizationId_documentCaseId_decidedAt_idx" ON "document_case_approvals"("organizationId", "documentCaseId", "decidedAt");
CREATE INDEX "document_case_deliveries_organizationId_documentCaseId_sentAt_idx" ON "document_case_deliveries"("organizationId", "documentCaseId", "sentAt");
CREATE UNIQUE INDEX "document_case_delivery_items_deliveryId_documentVersionId_key" ON "document_case_delivery_items"("deliveryId", "documentVersionId");
CREATE UNIQUE INDEX "document_case_task_links_taskId_key" ON "document_case_task_links"("taskId");
CREATE UNIQUE INDEX "document_case_task_links_organizationId_deduplicationKey_key" ON "document_case_task_links"("organizationId", "deduplicationKey");
CREATE INDEX "document_case_task_links_organizationId_documentCaseId_taskKind_resolvedAt_idx" ON "document_case_task_links"("organizationId", "documentCaseId", "taskKind", "resolvedAt");

ALTER TABLE "document_cases" ADD CONSTRAINT "document_cases_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_cases" ADD CONSTRAINT "document_cases_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_cases" ADD CONSTRAINT "document_cases_managerAssigneeId_fkey" FOREIGN KEY ("managerAssigneeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_cases" ADD CONSTRAINT "document_cases_secretaryAssigneeId_fkey" FOREIGN KEY ("secretaryAssigneeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_cases" ADD CONSTRAINT "document_cases_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "document_case_documents" ADD CONSTRAINT "document_case_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_documents" ADD CONSTRAINT "document_case_documents_documentCaseId_fkey" FOREIGN KEY ("documentCaseId") REFERENCES "document_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_document_versions" ADD CONSTRAINT "document_case_document_versions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_document_versions" ADD CONSTRAINT "document_case_document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document_case_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_document_versions" ADD CONSTRAINT "document_case_document_versions_sourceWorkReportId_fkey" FOREIGN KEY ("sourceWorkReportId") REFERENCES "service_call_work_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_document_versions" ADD CONSTRAINT "document_case_document_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "document_case_approvals" ADD CONSTRAINT "document_case_approvals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_approvals" ADD CONSTRAINT "document_case_approvals_documentCaseId_fkey" FOREIGN KEY ("documentCaseId") REFERENCES "document_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_approvals" ADD CONSTRAINT "document_case_approvals_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_case_document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_approvals" ADD CONSTRAINT "document_case_approvals_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_deliveries" ADD CONSTRAINT "document_case_deliveries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_deliveries" ADD CONSTRAINT "document_case_deliveries_documentCaseId_fkey" FOREIGN KEY ("documentCaseId") REFERENCES "document_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_deliveries" ADD CONSTRAINT "document_case_deliveries_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_delivery_items" ADD CONSTRAINT "document_case_delivery_items_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "document_case_deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_delivery_items" ADD CONSTRAINT "document_case_delivery_items_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_case_document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_task_links" ADD CONSTRAINT "document_case_task_links_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_task_links" ADD CONSTRAINT "document_case_task_links_documentCaseId_fkey" FOREIGN KEY ("documentCaseId") REFERENCES "document_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_task_links" ADD CONSTRAINT "document_case_task_links_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_case_task_links" ADD CONSTRAINT "document_case_task_links_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_case_document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
