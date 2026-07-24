import { ApiRequestError } from "../lib/api-client.js";
import type { TranslationMessages } from "./types.js";

export function translateApiError(
  error: unknown,
  messages: TranslationMessages,
  fallback: string,
): string {
  if (error instanceof ApiRequestError) {
    const mapped = messages.apiErrors[error.code];
    if (mapped) {
      return mapped;
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
