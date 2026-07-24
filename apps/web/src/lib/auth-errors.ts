import { translateApiError as translateApiErrorMessage } from "../i18n/api-errors.js";
import { DEFAULT_LOCALE, getMessages } from "../i18n/translate.js";
import { ApiRequestError } from "./api-client.js";

export function getAuthErrorMessage(error: unknown): string {
  const messages = getMessages(DEFAULT_LOCALE);
  return translateApiErrorMessage(error, messages, messages.common.unexpectedError);
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const messages = getMessages(DEFAULT_LOCALE);
  return translateApiErrorMessage(error, messages, fallback);
}

export { ApiRequestError };
