CREATE TYPE "InventoryLocationType" AS ENUM ('SERVICE_VAN', 'CENTRAL_WAREHOUSE');

CREATE TABLE "part_categories" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "part_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "part_subcategories" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "part_subcategories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "catalog_parts" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  "subcategoryId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "partNumber" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "catalog_parts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_locations" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "type" "InventoryLocationType" NOT NULL,
  "assignedUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_items" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "partId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_items_quantity_non_negative" CHECK ("quantity" >= 0)
);

CREATE TABLE "service_call_work_reports" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "serviceCallId" UUID NOT NULL,
  "visitId" UUID NOT NULL,
  "technicianId" UUID NOT NULL,
  "workPerformed" TEXT,
  "customerName" TEXT,
  "customerSignatureData" TEXT,
  "signedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "service_call_work_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_call_work_report_parts" (
  "id" UUID NOT NULL,
  "workReportId" UUID NOT NULL,
  "inventoryItemId" UUID NOT NULL,
  "catalogPartId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_call_work_report_parts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "service_call_work_report_parts_quantity_positive" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX "service_call_work_reports_visitId_key" ON "service_call_work_reports"("visitId");
CREATE INDEX "part_categories_organizationId_idx" ON "part_categories"("organizationId");
CREATE INDEX "part_categories_organizationId_deletedAt_idx" ON "part_categories"("organizationId", "deletedAt");
CREATE INDEX "part_subcategories_organizationId_idx" ON "part_subcategories"("organizationId");
CREATE INDEX "part_subcategories_categoryId_idx" ON "part_subcategories"("categoryId");
CREATE INDEX "part_subcategories_organizationId_deletedAt_idx" ON "part_subcategories"("organizationId", "deletedAt");
CREATE INDEX "catalog_parts_organizationId_idx" ON "catalog_parts"("organizationId");
CREATE INDEX "catalog_parts_categoryId_idx" ON "catalog_parts"("categoryId");
CREATE INDEX "catalog_parts_subcategoryId_idx" ON "catalog_parts"("subcategoryId");
CREATE INDEX "catalog_parts_organizationId_deletedAt_idx" ON "catalog_parts"("organizationId", "deletedAt");
CREATE INDEX "inventory_locations_organizationId_idx" ON "inventory_locations"("organizationId");
CREATE INDEX "inventory_locations_organizationId_type_idx" ON "inventory_locations"("organizationId", "type");
CREATE INDEX "inventory_locations_assignedUserId_idx" ON "inventory_locations"("assignedUserId");
CREATE INDEX "inventory_locations_organizationId_deletedAt_idx" ON "inventory_locations"("organizationId", "deletedAt");
CREATE INDEX "inventory_items_organizationId_idx" ON "inventory_items"("organizationId");
CREATE INDEX "inventory_items_locationId_idx" ON "inventory_items"("locationId");
CREATE INDEX "inventory_items_partId_idx" ON "inventory_items"("partId");
CREATE INDEX "inventory_items_organizationId_deletedAt_idx" ON "inventory_items"("organizationId", "deletedAt");
CREATE INDEX "service_call_work_reports_organizationId_idx" ON "service_call_work_reports"("organizationId");
CREATE INDEX "service_call_work_reports_serviceCallId_idx" ON "service_call_work_reports"("serviceCallId");
CREATE INDEX "service_call_work_reports_technicianId_idx" ON "service_call_work_reports"("technicianId");
CREATE INDEX "service_call_work_reports_organizationId_deletedAt_idx" ON "service_call_work_reports"("organizationId", "deletedAt");
CREATE INDEX "service_call_work_report_parts_workReportId_idx" ON "service_call_work_report_parts"("workReportId");
CREATE INDEX "service_call_work_report_parts_inventoryItemId_idx" ON "service_call_work_report_parts"("inventoryItemId");
CREATE INDEX "service_call_work_report_parts_catalogPartId_idx" ON "service_call_work_report_parts"("catalogPartId");

ALTER TABLE "part_categories"
  ADD CONSTRAINT "part_categories_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "part_subcategories"
  ADD CONSTRAINT "part_subcategories_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "part_subcategories"
  ADD CONSTRAINT "part_subcategories_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "part_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalog_parts"
  ADD CONSTRAINT "catalog_parts_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalog_parts"
  ADD CONSTRAINT "catalog_parts_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "part_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalog_parts"
  ADD CONSTRAINT "catalog_parts_subcategoryId_fkey"
  FOREIGN KEY ("subcategoryId") REFERENCES "part_subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_locations"
  ADD CONSTRAINT "inventory_locations_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_locations"
  ADD CONSTRAINT "inventory_locations_assignedUserId_fkey"
  FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_partId_fkey"
  FOREIGN KEY ("partId") REFERENCES "catalog_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_call_work_reports"
  ADD CONSTRAINT "service_call_work_reports_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_call_work_reports"
  ADD CONSTRAINT "service_call_work_reports_serviceCallId_fkey"
  FOREIGN KEY ("serviceCallId") REFERENCES "service_calls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_call_work_reports"
  ADD CONSTRAINT "service_call_work_reports_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "service_call_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_call_work_reports"
  ADD CONSTRAINT "service_call_work_reports_technicianId_fkey"
  FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_call_work_report_parts"
  ADD CONSTRAINT "service_call_work_report_parts_workReportId_fkey"
  FOREIGN KEY ("workReportId") REFERENCES "service_call_work_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_call_work_report_parts"
  ADD CONSTRAINT "service_call_work_report_parts_inventoryItemId_fkey"
  FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_call_work_report_parts"
  ADD CONSTRAINT "service_call_work_report_parts_catalogPartId_fkey"
  FOREIGN KEY ("catalogPartId") REFERENCES "catalog_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "part_categories_active_name_unique"
  ON "part_categories"("organizationId", "name")
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "part_subcategories_active_name_unique"
  ON "part_subcategories"("organizationId", "categoryId", "name")
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "catalog_parts_active_name_unique"
  ON "catalog_parts"("organizationId", "subcategoryId", "name")
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "inventory_locations_active_name_unique"
  ON "inventory_locations"("organizationId", "name")
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "inventory_items_active_location_part_unique"
  ON "inventory_items"("locationId", "partId")
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "inventory_locations_one_van_per_user_unique"
  ON "inventory_locations"("organizationId", "assignedUserId")
  WHERE "deletedAt" IS NULL AND "assignedUserId" IS NOT NULL AND "type" = 'SERVICE_VAN';
