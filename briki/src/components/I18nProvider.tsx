"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en";
import es from "@/messages/es";

type SupportedLocale = "en" | "es";

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (loc: SupportedLocale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function useAppLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useAppLocale must be used within I18nProvider");
  }
  return ctx;
}

export default function I18nProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<SupportedLocale>("en");

  const messages = useMemo(() => (locale === "en" ? en : es), [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale: () => setLocale((prev) => (prev === "en" ? "es" : "en")),
    }),
    [locale]
  );

  return (
    <LocaleContext.Provider value={value}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}


