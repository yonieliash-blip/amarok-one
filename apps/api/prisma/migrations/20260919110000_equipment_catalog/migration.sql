-- Equipment catalog: manufacturers and models, while retaining legacy asset text fields.
CREATE TABLE "equipment_manufacturers" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "equipment_manufacturers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "equipment_models" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "equipmentManufacturerId" UUID NOT NULL,
    "equipmentTypeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "equipment_models_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "equipment" ADD COLUMN "manufacturerId" UUID;
ALTER TABLE "equipment" ADD COLUMN "modelId" UUID;

CREATE UNIQUE INDEX "equipment_manufacturers_organizationId_key_key"
  ON "equipment_manufacturers"("organizationId", "key");
CREATE INDEX "equipment_manufacturers_organizationId_idx"
  ON "equipment_manufacturers"("organizationId");
CREATE INDEX "equipment_manufacturers_organizationId_deletedAt_idx"
  ON "equipment_manufacturers"("organizationId", "deletedAt");
CREATE UNIQUE INDEX "equipment_models_equipmentManufacturerId_equipmentTypeId_key_key"
  ON "equipment_models"("equipmentManufacturerId", "equipmentTypeId", "key");
CREATE INDEX "equipment_models_organizationId_idx" ON "equipment_models"("organizationId");
CREATE INDEX "equipment_models_organizationId_deletedAt_idx"
  ON "equipment_models"("organizationId", "deletedAt");
CREATE INDEX "equipment_models_equipmentManufacturerId_equipmentTypeId_idx"
  ON "equipment_models"("equipmentManufacturerId", "equipmentTypeId");
CREATE INDEX "equipment_organizationId_manufacturerId_idx" ON "equipment"("organizationId", "manufacturerId");
CREATE INDEX "equipment_organizationId_modelId_idx" ON "equipment"("organizationId", "modelId");

ALTER TABLE "equipment_manufacturers"
  ADD CONSTRAINT "equipment_manufacturers_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_models"
  ADD CONSTRAINT "equipment_models_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_models"
  ADD CONSTRAINT "equipment_models_equipmentManufacturerId_fkey"
  FOREIGN KEY ("equipmentManufacturerId") REFERENCES "equipment_manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment_models"
  ADD CONSTRAINT "equipment_models_equipmentTypeId_fkey"
  FOREIGN KEY ("equipmentTypeId") REFERENCES "equipment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "equipment"
  ADD CONSTRAINT "equipment_manufacturerId_fkey"
  FOREIGN KEY ("manufacturerId") REFERENCES "equipment_manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "equipment"
  ADD CONSTRAINT "equipment_modelId_fkey"
  FOREIGN KEY ("modelId") REFERENCES "equipment_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;
