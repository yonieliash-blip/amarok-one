import type {
  DirectConversationSummary,
  DirectMessage,
  DirectMessageMember,
} from "@amarok-one/types";
import { Prisma } from "@prisma/client";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { canonicalParticipants } from "./messages.helpers.js";
import type { SendDirectMessageInput } from "./messages.schemas.js";

const activeMemberInclude = {
  user: { select: { id: true, displayName: true, email: true } },
  primaryRole: { select: { id: true, slug: true, name: true } },
} as const satisfies Prisma.OrganizationMemberInclude;

type ActiveMember = Prisma.OrganizationMemberGetPayload<{ include: typeof activeMemberInclude }>;

const conversationInclude = {
  participantOne: { select: { id: true, displayName: true, email: true } },
  participantTwo: { select: { id: true, displayName: true, email: true } },
  messages: {
    select: { id: true, body: true, senderId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} as const satisfies Prisma.DirectConversationInclude;

function toMember(member: ActiveMember): DirectMessageMember {
  return {
    id: member.id,
    userId: member.userId,
    displayName: member.user.displayName,
    email: member.user.email,
    role: member.primaryRole,
  };
}

function toMessage(row: {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}): DirectMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    body: row.body,
    readAt: row.readAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadActiveMember(organizationId: string, userId: string): Promise<ActiveMember> {
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId,
      deletedAt: null,
      status: "ACTIVE",
      user: { deletedAt: null, isActive: true },
      primaryRole: { deletedAt: null },
    },
    include: activeMemberInclude,
  });
  if (!member) throw forbidden("Active organization membership required");
  return member;
}

async function loadConversationForParticipant(
  organizationId: string,
  conversationId: string,
  userId: string,
) {
  const conversation = await prisma.directConversation.findFirst({
    where: {
      id: conversationId,
      organizationId,
      OR: [{ participantOneId: userId }, { participantTwoId: userId }],
    },
  });
  if (!conversation) throw notFound("Conversation", conversationId);
  return conversation;
}

export function createMessagesService() {
  async function listRecipients(
    organizationId: string,
    actorId: string,
  ): Promise<DirectMessageMember[]> {
    await loadActiveMember(organizationId, actorId);
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId,
        userId: { not: actorId },
        deletedAt: null,
        status: "ACTIVE",
        user: { deletedAt: null, isActive: true },
        primaryRole: { deletedAt: null },
      },
      include: activeMemberInclude,
      orderBy: { user: { displayName: "asc" } },
    });
    return members.map(toMember);
  }

  async function listConversations(
    organizationId: string,
    actorId: string,
  ): Promise<DirectConversationSummary[]> {
    await loadActiveMember(organizationId, actorId);
    const rows = await prisma.directConversation.findMany({
      where: {
        organizationId,
        OR: [{ participantOneId: actorId }, { participantTwoId: actorId }],
      },
      include: conversationInclude,
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    });

    const counterpartUserIds = rows.map((row) =>
      row.participantOneId === actorId ? row.participantTwoId : row.participantOneId,
    );
    const counterpartMembers = await prisma.organizationMember.findMany({
      where: {
        organizationId,
        userId: { in: counterpartUserIds },
        deletedAt: null,
        status: "ACTIVE",
        user: { deletedAt: null, isActive: true },
        primaryRole: { deletedAt: null },
      },
      include: activeMemberInclude,
    });
    const memberByUserId = new Map(counterpartMembers.map((member) => [member.userId, member]));

    return Promise.all(
      rows.flatMap((row) => {
        const counterpartUserId =
          row.participantOneId === actorId ? row.participantTwoId : row.participantOneId;
        const member = memberByUserId.get(counterpartUserId);
        if (!member) return [];
        return [
          (async (): Promise<DirectConversationSummary> => ({
            id: row.id,
            organizationId: row.organizationId,
            member: toMember(member),
            lastMessage: row.messages[0]
              ? {
                  id: row.messages[0].id,
                  body: row.messages[0].body,
                  senderId: row.messages[0].senderId,
                  createdAt: row.messages[0].createdAt.toISOString(),
                }
              : undefined,
            unreadCount: await prisma.directMessage.count({
              where: {
                organizationId,
                conversationId: row.id,
                senderId: { not: actorId },
                readAt: null,
              },
            }),
            updatedAt: row.updatedAt.toISOString(),
          }))(),
        ];
      }),
    );
  }

  async function listMessages(organizationId: string, conversationId: string, actorId: string) {
    await loadActiveMember(organizationId, actorId);
    await loadConversationForParticipant(organizationId, conversationId, actorId);
    const rows = await prisma.directMessage.findMany({
      where: { organizationId, conversationId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.reverse().map(toMessage);
  }

  async function markConversationRead(
    organizationId: string,
    conversationId: string,
    actorId: string,
  ) {
    await loadActiveMember(organizationId, actorId);
    await loadConversationForParticipant(organizationId, conversationId, actorId);
    const result = await prisma.directMessage.updateMany({
      where: {
        organizationId,
        conversationId,
        senderId: { not: actorId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { conversationId, markedRead: result.count };
  }

  async function unreadCount(organizationId: string, actorId: string) {
    await loadActiveMember(organizationId, actorId);
    const count = await prisma.directMessage.count({
      where: {
        organizationId,
        senderId: { not: actorId },
        readAt: null,
        conversation: {
          OR: [{ participantOneId: actorId }, { participantTwoId: actorId }],
        },
      },
    });
    return { count };
  }

  async function sendMessageToMember(
    organizationId: string,
    recipientMemberId: string,
    actorId: string,
    input: SendDirectMessageInput,
  ) {
    const [actor, recipient] = await Promise.all([
      loadActiveMember(organizationId, actorId),
      prisma.organizationMember.findFirst({
        where: {
          id: recipientMemberId,
          organizationId,
          deletedAt: null,
          status: "ACTIVE",
          user: { deletedAt: null, isActive: true },
          primaryRole: { deletedAt: null },
        },
        include: activeMemberInclude,
      }),
    ]);
    if (!recipient) throw notFound("Active organization member", recipientMemberId);
    if (actor.userId === recipient.userId)
      throw badRequest("Cannot send a direct message to yourself");

    const [participantOneId, participantTwoId] = canonicalParticipants(
      actor.userId,
      recipient.userId,
    );
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const conversation = await tx.directConversation.upsert({
        where: {
          organizationId_participantOneId_participantTwoId: {
            organizationId,
            participantOneId,
            participantTwoId,
          },
        },
        create: { organizationId, participantOneId, participantTwoId, lastMessageAt: now },
        update: { lastMessageAt: now },
      });
      const message = await tx.directMessage.create({
        data: {
          organizationId,
          conversationId: conversation.id,
          senderId: actor.userId,
          body: input.body.trim(),
        },
      });
      return { conversation, message };
    });

    return { conversationId: result.conversation.id, message: toMessage(result.message) };
  }

  return {
    listRecipients,
    listConversations,
    listMessages,
    markConversationRead,
    unreadCount,
    sendMessageToMember,
  };
}

export type MessagesService = ReturnType<typeof createMessagesService>;
