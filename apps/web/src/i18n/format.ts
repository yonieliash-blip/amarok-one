import { DEFAULT_LOCALE } from "./translate.js";
import type { Locale } from "./types.js";

const HEBREW_LOCALE = "he-IL";
const ISRAEL_TIME_ZONE = "Asia/Jerusalem";

export function getFormatLocale(locale: Locale = DEFAULT_LOCALE): string {
  return locale === "he" ? HEBREW_LOCALE : "en-IL";
}

/** Israeli date formatting (e.g. 18.07.2026). */
export function formatDate(
  value: string | Date,
  locale: Locale = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(getFormatLocale(locale), options).format(date);
}

/** Israeli date and time formatting (e.g. 18.07.2026, 14:30). */
export function formatDateTime(value: string | Date, locale: Locale = DEFAULT_LOCALE): string {
  return formatDate(value, locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ISRAEL_TIME_ZONE,
  });
}

/** Israeli currency formatting (ILS). */
export function formatCurrency(
  amount: number,
  locale: Locale = DEFAULT_LOCALE,
  currency = "ILS",
): string {
  return new Intl.NumberFormat(getFormatLocale(locale), {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Formats phone numbers for Israeli display when recognizable. */
export function formatPhone(value: string, locale: Locale = DEFAULT_LOCALE): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return value;
  }

  let normalized = digits;
  if (normalized.startsWith("972")) {
    normalized = `0${normalized.slice(3)}`;
  }

  if (locale === "he" && normalized.length === 10 && normalized.startsWith("0")) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }

  if (normalized.length === 9 && !normalized.startsWith("0")) {
    return `0${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5)}`;
  }

  return value;
}

/** Locale-aware grouping for counts and numbers. */
export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(getFormatLocale(locale)).format(value);
}
