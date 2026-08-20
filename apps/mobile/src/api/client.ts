import type { ApiError, ApiResponse } from "@amarok-one/types";
import { env } from "../config/env";

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

function isDevelopmentBuild(): boolean {
  return process.env.NODE_ENV !== "production";
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

  if (!env.isApiConfigured && !isDevelopmentBuild()) {
    throw new ApiRequestError(
      "API_NOT_CONFIGURED",
      "The app server is not configured. Please contact your administrator.",
      0,
    );
  }

  const url = `${env.apiUrl}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiRequestError(
      "NETWORK_UNAVAILABLE",
      "Cannot reach the app server. Check your internet connection and try again.",
      0,
    );
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  return (await response.json()) as ApiResponse<T>;
}
