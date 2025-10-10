import type { Metadata } from "next";
import CommandPalette from "@/components/CommandPalette";
import I18nProvider from "@/components/I18nProvider";
import { Toaster } from "sonner";
import DevAxeClient from "@/components/DevAxeClient";
import { getMessages, setRequestLocale } from 'next-intl/server';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <I18nProvider locale={locale} messages={messages}>
      <main className="flex-1 flex flex-col min-h-0" role="main" aria-label="Contenido principal de la aplicación">
        {children}
      </main>
      <CommandPalette />
      <Toaster />
      <DevAxeClient />
    </I18nProvider>
  );
}
