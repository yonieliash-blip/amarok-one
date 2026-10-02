ALTER TABLE "organization_members"
  ADD COLUMN "birthDate" DATE;

CREATE TABLE "direct_conversations" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "participantOneId" UUID NOT NULL,
  "participantTwoId" UUID NOT NULL,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "direct_conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "direct_conversations_distinct_participants_check"
    CHECK ("participantOneId" < "participantTwoId"),
  CONSTRAINT "direct_conversations_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "direct_conversations_participantOneId_fkey"
    FOREIGN KEY ("participantOneId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "direct_conversations_participantTwoId_fkey"
    FOREIGN KEY ("participantTwoId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "direct_conversations_organizationId_participantOneId_participantTwoId_key"
  ON "direct_conversations"("organizationId", "participantOneId", "participantTwoId");
CREATE INDEX "direct_conversations_organizationId_lastMessageAt_idx"
  ON "direct_conversations"("organizationId", "lastMessageAt");
CREATE INDEX "direct_conversations_organizationId_participantOneId_idx"
  ON "direct_conversations"("organizationId", "participantOneId");
CREATE INDEX "direct_conversations_organizationId_participantTwoId_idx"
  ON "direct_conversations"("organizationId", "participantTwoId");

CREATE TABLE "direct_messages" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "senderId" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "direct_messages_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "direct_messages_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "direct_conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "direct_messages_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "direct_messages_organizationId_conversationId_createdAt_idx"
  ON "direct_messages"("organizationId", "conversationId", "createdAt");
CREATE INDEX "direct_messages_organizationId_senderId_idx"
  ON "direct_messages"("organizationId", "senderId");
