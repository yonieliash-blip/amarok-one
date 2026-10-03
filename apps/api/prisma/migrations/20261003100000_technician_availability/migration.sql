-- Dispatcher-managed daily availability overrides for technicians.
CREATE TYPE "TechnicianAvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

CREATE TABLE "technician_availability" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "technicianId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "TechnicianAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technician_availability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "technician_availability_organizationId_technicianId_date_key"
  ON "technician_availability"("organizationId", "technicianId", "date");
CREATE INDEX "technician_availability_organizationId_date_idx"
  ON "technician_availability"("organizationId", "date");
CREATE INDEX "technician_availability_organizationId_technicianId_date_idx"
  ON "technician_availability"("organizationId", "technicianId", "date");

ALTER TABLE "technician_availability"
  ADD CONSTRAINT "technician_availability_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "technician_availability"
  ADD CONSTRAINT "technician_availability_technicianId_fkey"
  FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
