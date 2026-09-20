-- Adds customer operational sites without modifying or removing existing customer data.
CREATE TABLE "customer_sites" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "customer_sites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_sites_customerId_name_key" ON "customer_sites"("customerId", "name");
CREATE INDEX "customer_sites_organizationId_idx" ON "customer_sites"("organizationId");
CREATE INDEX "customer_sites_customerId_deletedAt_idx" ON "customer_sites"("customerId", "deletedAt");

ALTER TABLE "equipment" ADD COLUMN "customerSiteId" UUID;
ALTER TABLE "service_calls" ADD COLUMN "customerSiteId" UUID;
CREATE INDEX "equipment_organizationId_customerSiteId_idx" ON "equipment"("organizationId", "customerSiteId");
CREATE INDEX "service_calls_organizationId_customerSiteId_idx" ON "service_calls"("organizationId", "customerSiteId");

ALTER TABLE "customer_sites" ADD CONSTRAINT "customer_sites_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_sites" ADD CONSTRAINT "customer_sites_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_customerSiteId_fkey" FOREIGN KEY ("customerSiteId") REFERENCES "customer_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_calls" ADD CONSTRAINT "service_calls_customerSiteId_fkey" FOREIGN KEY ("customerSiteId") REFERENCES "customer_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
