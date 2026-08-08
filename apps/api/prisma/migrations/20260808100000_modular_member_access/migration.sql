-- Modular membership + organization owner role

CREATE TYPE "OrganizationMemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

ALTER TABLE "roles" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "roles" ADD COLUMN "isOwner" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "primaryRoleId" UUID NOT NULL,
    "isOrganizationOwner" BOOLEAN NOT NULL DEFAULT false,
    "status" "OrganizationMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "permissionsVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member_module_access" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "organizationMemberId" UUID NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_module_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");
CREATE INDEX "organization_members_organizationId_idx" ON "organization_members"("organizationId");
CREATE INDEX "organization_members_userId_idx" ON "organization_members"("userId");
CREATE INDEX "organization_members_organizationId_deletedAt_idx" ON "organization_members"("organizationId", "deletedAt");

CREATE UNIQUE INDEX "member_module_access_organizationMemberId_moduleKey_key" ON "member_module_access"("organizationMemberId", "moduleKey");
CREATE INDEX "member_module_access_organizationId_idx" ON "member_module_access"("organizationId");
CREATE INDEX "member_module_access_organizationMemberId_idx" ON "member_module_access"("organizationMemberId");

ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_primaryRoleId_fkey" FOREIGN KEY ("primaryRoleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "member_module_access" ADD CONSTRAINT "member_module_access_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "member_module_access" ADD CONSTRAINT "member_module_access_organizationMemberId_fkey" FOREIGN KEY ("organizationMemberId") REFERENCES "organization_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
