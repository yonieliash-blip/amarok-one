import type { MemberModuleKey } from "@amarok-one/types";
import { apiRequest } from "./api-client";

export interface MemberAccessSummary {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  primaryRole: {
    id: string;
    slug: string;
    name: string;
  };
  isOrganizationOwner: boolean;
  enabledModules: MemberModuleKey[];
  permissionsVersion: number;
}

export interface MemberAccessDetail extends MemberAccessSummary {
  availableModules: Array<{
    key: MemberModuleKey;
    name: string;
    description: string;
  }>;
}

export async function listMemberAccessRequest(
  organizationId: string,
  accessToken: string,
): Promise<MemberAccessSummary[]> {
  const response = await apiRequest<MemberAccessSummary[]>(
    `/organizations/${organizationId}/access/members`,
    { accessToken },
  );
  return response.data;
}

export async function getMemberAccessRequest(
  organizationId: string,
  memberId: string,
  accessToken: string,
): Promise<MemberAccessDetail> {
  const response = await apiRequest<MemberAccessDetail>(
    `/organizations/${organizationId}/access/members/${memberId}`,
    { accessToken },
  );
  return response.data;
}

export async function updateMemberModulesRequest(
  organizationId: string,
  memberId: string,
  accessToken: string,
  enabledModules: MemberModuleKey[],
): Promise<{ id: string; enabledModules: MemberModuleKey[]; permissionsVersion: number }> {
  const response = await apiRequest<{
    id: string;
    enabledModules: MemberModuleKey[];
    permissionsVersion: number;
  }>(`/organizations/${organizationId}/access/members/${memberId}/modules`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify({ enabledModules }),
  });
  return response.data;
}
