import type { MemberModuleKey } from "@amarok-one/types";
import { apiRequest } from "./client";

export type ManagerEmployeeRoleSlug = "technician" | "service-coordinator";

export interface ManagerMemberSummary {
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

export interface ManagerMemberModule {
  key: MemberModuleKey;
  name: string;
  description: string;
}

export interface ManagerMemberAccess extends ManagerMemberSummary {
  availableModules: ManagerMemberModule[];
}

export async function listManagerMembers(
  organizationId: string,
  accessToken: string,
): Promise<ManagerMemberSummary[]> {
  const response = await apiRequest<ManagerMemberSummary[]>(
    `/organizations/${organizationId}/access/members`,
    { accessToken },
  );
  return response.data ?? [];
}

export async function createManagerMember(
  organizationId: string,
  accessToken: string,
  input: {
    displayName: string;
    email: string;
    password: string;
    roleSlug: ManagerEmployeeRoleSlug;
  },
): Promise<ManagerMemberSummary> {
  const response = await apiRequest<ManagerMemberSummary>(
    `/organizations/${organizationId}/access/members`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    },
  );
  return response.data;
}

export async function getManagerMemberAccess(
  organizationId: string,
  memberId: string,
  accessToken: string,
): Promise<ManagerMemberAccess> {
  const response = await apiRequest<ManagerMemberAccess>(
    `/organizations/${organizationId}/access/members/${memberId}`,
    { accessToken },
  );
  return response.data;
}

export async function updateManagerMemberModules(
  organizationId: string,
  memberId: string,
  accessToken: string,
  enabledModules: MemberModuleKey[],
): Promise<Pick<ManagerMemberSummary, "id" | "enabledModules" | "permissionsVersion">> {
  const response = await apiRequest<
    Pick<ManagerMemberSummary, "id" | "enabledModules" | "permissionsVersion">
  >(`/organizations/${organizationId}/access/members/${memberId}/modules`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify({ enabledModules }),
  });
  return response.data;
}
