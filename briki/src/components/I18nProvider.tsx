'use client'

import { NextIntlClientProvider } from 'next-intl'

type I18nProviderProps = {
  children: React.ReactNode
  locale: string
  messages: any // More specific type can be used if you have generated types
}

export default function I18nProvider({
  children,
  locale,
  messages,
}: I18nProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="UTC" // You can make this dynamic if needed
    >
      {children}
    </NextIntlClientProvider>
  )
}


