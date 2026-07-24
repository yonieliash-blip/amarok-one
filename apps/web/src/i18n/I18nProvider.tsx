import { useEffect, useMemo, type ReactNode } from "react";
import { I18nContext, type I18nContextValue } from "./i18n-context.js";
import { DEFAULT_LOCALE, getDirection, getMessages, interpolate } from "./translate.js";
import type { Locale, TranslationMessages } from "./types.js";

interface I18nProviderProps {
  children: ReactNode;
  locale?: Locale;
}

export function I18nProvider({ children, locale = DEFAULT_LOCALE }: I18nProviderProps) {
  const messages = useMemo(() => getMessages(locale), [locale]);
  const direction = getDirection(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale, direction]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      direction,
      messages,
      t(section: keyof TranslationMessages, key: string, params?: Record<string, string | number>) {
        const group = messages[section] as Record<string, string>;
        const template = group[key] ?? `${String(section)}.${key}`;
        return interpolate(template, params);
      },
    }),
    [locale, direction, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
