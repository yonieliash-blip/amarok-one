import type { ApiError, ApiResponse, HealthStatus, ISODateString } from "@amarok-one/types";

/** Create a typed API success response */
export function createApiResponse<T>(data: T, meta?: ApiResponse<T>["meta"]): ApiResponse<T> {
  return meta ? { data, meta } : { data };
}

/** Create a typed API error */
export function createApiError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ApiError {
  return details ? { code, message, details } : { code, message };
}

/** Build a health status payload */
export function createHealthStatus(
  service: string,
  status: HealthStatus["status"] = "ok",
): HealthStatus {
  return {
    status,
    service,
    timestamp: new Date().toISOString() as ISODateString,
  };
}

/** Sleep for a given number of milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Assert a value is defined; throws if null or undefined */
export function assertDefined<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

/** Format a display name from email when name is unavailable */
export function formatDisplayName(email: string, displayName?: string): string {
  if (displayName?.trim()) {
    return displayName.trim();
  }
  const localPart = email.split("@")[0] ?? email;
  return localPart.replace(/[._-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
