-- Sprint 1: Organization domain — Company and Branch

CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "addressLine1" TEXT,
    "city" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "companies_organizationId_idx" ON "companies"("organizationId");
CREATE INDEX "companies_organizationId_deletedAt_idx" ON "companies"("organizationId", "deletedAt");
CREATE UNIQUE INDEX "companies_organizationId_code_key" ON "companies"("organizationId", "code");

CREATE INDEX "branches_organizationId_idx" ON "branches"("organizationId");
CREATE INDEX "branches_companyId_idx" ON "branches"("companyId");
CREATE INDEX "branches_organizationId_deletedAt_idx" ON "branches"("organizationId", "deletedAt");
CREATE UNIQUE INDEX "branches_companyId_code_key" ON "branches"("companyId", "code");

ALTER TABLE "companies" ADD CONSTRAINT "companies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "branches" ADD CONSTRAINT "branches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "branches" ADD CONSTRAINT "branches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
