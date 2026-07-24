import { createContext } from "react";
import type { Locale, TextDirection, TranslationMessages } from "./types.js";

export interface I18nContextValue {
  locale: Locale;
  direction: TextDirection;
  messages: TranslationMessages;
  t: (
    section: keyof TranslationMessages,
    key: string,
    params?: Record<string, string | number>,
  ) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
