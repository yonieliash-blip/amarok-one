import type { AuthSession, AuthUser } from "@amarok-one/types";
import { apiRequest } from "../lib/api-client";

export interface LoginCredentials {
  email: string;
  password: string;
  organizationSlug?: string;
}

export async function loginRequest(credentials: LoginCredentials): Promise<AuthSession> {
  const response = await apiRequest<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  return response.data;
}

export async function refreshSessionRequest(
  refreshToken: string,
  organizationId?: string,
): Promise<AuthSession> {
  const response = await apiRequest<AuthSession>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken, organizationId }),
  });
  return response.data;
}

export async function switchRoleRequest(accessToken: string, roleId: string): Promise<AuthSession> {
  const response = await apiRequest<AuthSession>("/auth/switch-role", {
    method: "POST",
    accessToken,
    body: JSON.stringify({ roleId }),
  });
  return response.data;
}

export async function logoutRequest(accessToken: string, refreshToken?: string): Promise<void> {
  await apiRequest<void>("/auth/logout", {
    method: "POST",
    accessToken,
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  });
}

export async function currentUserRequest(accessToken: string): Promise<AuthUser> {
  const response = await apiRequest<AuthUser>("/auth/me", {
    accessToken,
  });
  return response.data;
}

export async function healthRequest(): Promise<{ status: string }> {
  const response = await apiRequest<{ status: string; database?: string }>("/health");
  return { status: response.data.status };
}
