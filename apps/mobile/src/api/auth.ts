import type { AuthSession, AuthUser } from "@amarok-one/types";
import { apiRequest } from "./client";

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

export async function refreshSessionRequest(refreshToken: string): Promise<AuthSession> {
  const response = await apiRequest<AuthSession>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  return response.data;
}

export async function currentUserRequest(accessToken: string): Promise<AuthUser> {
  const response = await apiRequest<AuthUser>("/auth/me", { accessToken });
  return response.data;
}

export async function logoutRequest(accessToken: string, refreshToken?: string): Promise<void> {
  await apiRequest<void>("/auth/logout", {
    method: "POST",
    accessToken,
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  });
}
