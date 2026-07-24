import type { Locale, TextDirection, TranslationMessages } from "./types.js";
import { en } from "./locales/en.js";
import { he } from "./locales/he.js";

export const DEFAULT_LOCALE: Locale = "he";

const LOCALES: Record<Locale, TranslationMessages> = { he, en };

const DIRECTION: Record<Locale, TextDirection> = {
  he: "rtl",
  en: "ltr",
};

export function getMessages(locale: Locale = DEFAULT_LOCALE): TranslationMessages {
  return LOCALES[locale];
}

export function getDirection(locale: Locale = DEFAULT_LOCALE): TextDirection {
  return DIRECTION[locale];
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{{${key}}}` : String(value);
  });
}

export function translatePermission(
  messages: TranslationMessages,
  slug: string,
  fallback: string,
): string {
  return messages.permissions[slug] ?? fallback;
}
