-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('ACTIVE', 'IN_SERVICE', 'OUT_OF_SERVICE', 'RETIRED');

-- CreateTable
CREATE TABLE "equipment_types" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "equipment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "equipmentTypeId" UUID NOT NULL,
    "customerId" UUID,
    "branchId" UUID,
    "name" TEXT NOT NULL,
    "internalNumber" TEXT NOT NULL,
    "serialNumber" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "engineHours" DECIMAL(10,2),
    "mileage" INTEGER,
    "registrationNumber" TEXT,
    "warrantyEndDate" DATE,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipment_types_organizationId_idx" ON "equipment_types"("organizationId");

-- CreateIndex
CREATE INDEX "equipment_types_organizationId_deletedAt_idx" ON "equipment_types"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_types_organizationId_code_key" ON "equipment_types"("organizationId", "code");

-- CreateIndex
CREATE INDEX "equipment_organizationId_idx" ON "equipment"("organizationId");

-- CreateIndex
CREATE INDEX "equipment_organizationId_deletedAt_idx" ON "equipment"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "equipment_organizationId_status_idx" ON "equipment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "equipment_organizationId_customerId_idx" ON "equipment"("organizationId", "customerId");

-- CreateIndex
CREATE INDEX "equipment_organizationId_equipmentTypeId_idx" ON "equipment"("organizationId", "equipmentTypeId");

-- CreateIndex
CREATE INDEX "equipment_organizationId_manufacturer_idx" ON "equipment"("organizationId", "manufacturer");

-- CreateIndex
CREATE INDEX "equipment_organizationId_model_idx" ON "equipment"("organizationId", "model");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_organizationId_internalNumber_key" ON "equipment"("organizationId", "internalNumber");

-- AddForeignKey
ALTER TABLE "equipment_types" ADD CONSTRAINT "equipment_types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_equipmentTypeId_fkey" FOREIGN KEY ("equipmentTypeId") REFERENCES "equipment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
