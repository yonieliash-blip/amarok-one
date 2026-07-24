import type { ApiError, ApiResponse } from "@amarok-one/types";
import { env } from "./env";

const REFRESH_TOKEN_KEY = "amarok_refresh_token";
const TOKEN_EXPIRES_KEY = "amarok_token_expires_at";
const ACTIVE_ROLE_KEY = "amarok_active_role_id";

export interface StoredSession {
  refreshToken: string;
  expiresAt: number;
  activeRoleId?: string;
}

export function persistRefreshToken(refreshToken: string, activeRoleId?: string): void {
  const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const expiresAt = Date.now() + REFRESH_TTL_MS;
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  sessionStorage.setItem(TOKEN_EXPIRES_KEY, String(expiresAt));
  if (activeRoleId) {
    sessionStorage.setItem(ACTIVE_ROLE_KEY, activeRoleId);
  }
}

export function persistActiveRoleId(activeRoleId: string): void {
  sessionStorage.setItem(ACTIVE_ROLE_KEY, activeRoleId);
}

export function readStoredSession(): StoredSession | null {
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  const expiresAtRaw = sessionStorage.getItem(TOKEN_EXPIRES_KEY);
  const activeRoleId = sessionStorage.getItem(ACTIVE_ROLE_KEY) ?? undefined;

  if (!refreshToken || !expiresAtRaw) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    clearStoredSession();
    return null;
  }

  return { refreshToken, expiresAt, activeRoleId };
}

export function clearStoredSession(): void {
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRES_KEY);
  sessionStorage.removeItem(ACTIVE_ROLE_KEY);
}

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

async function parseErrorResponse(response: Response): Promise<ApiRequestError> {
  try {
    const payload = (await response.json()) as ApiError;
    return new ApiRequestError(
      payload.code ?? "REQUEST_FAILED",
      payload.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload.details,
    );
  } catch {
    return new ApiRequestError(
      "REQUEST_FAILED",
      `Request failed with status ${response.status}`,
      response.status,
    );
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<ApiResponse<T>> {
  const { accessToken, headers, ...rest } = options;
  const url = `${env.apiUrl}${path}`;

  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  return (await response.json()) as ApiResponse<T>;
}
