CREATE TABLE "stock_locations" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "stock_locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_items" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "stockLocationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "partNumber" TEXT,
  "quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL DEFAULT 'יח׳',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_locations_organizationId_name_key" ON "stock_locations"("organizationId", "name");
CREATE INDEX "stock_locations_organizationId_kind_deletedAt_idx" ON "stock_locations"("organizationId", "kind", "deletedAt");
CREATE INDEX "inventory_items_organizationId_stockLocationId_deletedAt_idx" ON "inventory_items"("organizationId", "stockLocationId", "deletedAt");

ALTER TABLE "stock_locations" ADD CONSTRAINT "stock_locations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_stockLocationId_fkey" FOREIGN KEY ("stockLocationId") REFERENCES "stock_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
