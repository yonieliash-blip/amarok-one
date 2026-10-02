import type {
  DirectConversationSummary,
  DirectMessage,
  DirectMessageMember,
} from "@amarok-one/types";
import { apiRequest } from "./api-client";

const basePath = (organizationId: string) => `/organizations/${organizationId}/messages`;

export async function listMessageMembersRequest(
  organizationId: string,
  accessToken: string,
): Promise<DirectMessageMember[]> {
  const response = await apiRequest<DirectMessageMember[]>(`${basePath(organizationId)}/members`, {
    accessToken,
  });
  return response.data;
}

export async function listConversationsRequest(
  organizationId: string,
  accessToken: string,
): Promise<DirectConversationSummary[]> {
  const response = await apiRequest<DirectConversationSummary[]>(
    `${basePath(organizationId)}/conversations`,
    { accessToken },
  );
  return response.data;
}

export async function listConversationMessagesRequest(
  organizationId: string,
  conversationId: string,
  accessToken: string,
): Promise<DirectMessage[]> {
  const response = await apiRequest<DirectMessage[]>(
    `${basePath(organizationId)}/conversations/${conversationId}/messages`,
    { accessToken },
  );
  return response.data;
}

export async function markConversationReadRequest(
  organizationId: string,
  conversationId: string,
  accessToken: string,
): Promise<void> {
  await apiRequest(`${basePath(organizationId)}/conversations/${conversationId}/read`, {
    method: "POST",
    accessToken,
  });
}

export async function sendDirectMessageRequest(
  organizationId: string,
  memberId: string,
  body: string,
  accessToken: string,
): Promise<{ conversationId: string; message: DirectMessage }> {
  const response = await apiRequest<{ conversationId: string; message: DirectMessage }>(
    `${basePath(organizationId)}/members/${memberId}/messages`,
    { method: "POST", accessToken, body: JSON.stringify({ body }) },
  );
  return response.data;
}

export async function getUnreadMessageCountRequest(
  organizationId: string,
  accessToken: string,
): Promise<number> {
  const response = await apiRequest<{ count: number }>(`${basePath(organizationId)}/unread-count`, {
    accessToken,
  });
  return response.data.count;
}
