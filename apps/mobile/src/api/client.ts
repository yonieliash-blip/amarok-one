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
