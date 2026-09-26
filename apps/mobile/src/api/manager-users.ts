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
