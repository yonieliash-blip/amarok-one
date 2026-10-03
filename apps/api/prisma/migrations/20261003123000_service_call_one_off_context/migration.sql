-- Preserve imported/customer equipment data while allowing a one-off field-service context.
-- This migration is additive: existing calls retain their linked equipment and null new fields.
ALTER TABLE "service_calls"
  ALTER COLUMN "equipmentId" DROP NOT NULL,
  ADD COLUMN "equipmentModel" TEXT,
  ADD COLUMN "equipmentLicensePlate" TEXT,
  ADD COLUMN "equipmentChassisNumber" TEXT,
  ADD COLUMN "purchaseOrderNumber" TEXT;
