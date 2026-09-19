CREATE TABLE "work_report_part_categories" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "work_report_part_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "work_report_part_categories_organizationId_name_key" ON "work_report_part_categories"("organizationId", "name");
CREATE INDEX "work_report_part_categories_organizationId_deletedAt_idx" ON "work_report_part_categories"("organizationId", "deletedAt");
ALTER TABLE "work_report_part_categories" ADD CONSTRAINT "work_report_part_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "work_report_parts" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "categoryId" UUID NOT NULL, "name" TEXT NOT NULL, "partNumber" TEXT, "unit" TEXT NOT NULL DEFAULT 'יח׳',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "work_report_parts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "work_report_parts_organizationId_categoryId_deletedAt_idx" ON "work_report_parts"("organizationId", "categoryId", "deletedAt");
ALTER TABLE "work_report_parts" ADD CONSTRAINT "work_report_parts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_report_parts" ADD CONSTRAINT "work_report_parts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "work_report_part_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "work_reports" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "serviceCallId" UUID NOT NULL, "visitId" UUID NOT NULL, "reportNumber" TEXT NOT NULL, "workDescription" TEXT NOT NULL DEFAULT '',
  "customerRepresentative" TEXT, "customerRepresentativeRole" TEXT, "signatureStrokes" JSONB, "signedAt" TIMESTAMP(3), "technicianId" UUID NOT NULL, "lastEditedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "work_reports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "work_reports_organizationId_reportNumber_key" ON "work_reports"("organizationId", "reportNumber");
CREATE UNIQUE INDEX "work_reports_visitId_key" ON "work_reports"("visitId");
CREATE INDEX "work_reports_organizationId_serviceCallId_deletedAt_idx" ON "work_reports"("organizationId", "serviceCallId", "deletedAt");
ALTER TABLE "work_reports" ADD CONSTRAINT "work_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_reports" ADD CONSTRAINT "work_reports_serviceCallId_fkey" FOREIGN KEY ("serviceCallId") REFERENCES "service_calls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_reports" ADD CONSTRAINT "work_reports_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "service_call_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_reports" ADD CONSTRAINT "work_reports_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_reports" ADD CONSTRAINT "work_reports_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "work_report_part_items" ("id" UUID NOT NULL, "reportId" UUID NOT NULL, "partId" UUID NOT NULL, "quantity" DECIMAL(12,3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "work_report_part_items_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "work_report_part_items_reportId_partId_key" ON "work_report_part_items"("reportId", "partId");
ALTER TABLE "work_report_part_items" ADD CONSTRAINT "work_report_part_items_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "work_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_report_part_items" ADD CONSTRAINT "work_report_part_items_partId_fkey" FOREIGN KEY ("partId") REFERENCES "work_report_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "work_report_media" ("id" UUID NOT NULL, "organizationId" UUID NOT NULL, "reportId" UUID NOT NULL, "mediaType" TEXT NOT NULL, "fileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "storageKey" TEXT NOT NULL, "sizeBytes" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "deletedAt" TIMESTAMP(3), CONSTRAINT "work_report_media_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "work_report_media_storageKey_key" ON "work_report_media"("storageKey");
CREATE INDEX "work_report_media_organizationId_reportId_deletedAt_idx" ON "work_report_media"("organizationId", "reportId", "deletedAt");
ALTER TABLE "work_report_media" ADD CONSTRAINT "work_report_media_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_report_media" ADD CONSTRAINT "work_report_media_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "work_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
