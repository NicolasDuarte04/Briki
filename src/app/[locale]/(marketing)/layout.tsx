import CommandPalette from "@/components/CommandPalette";
import I18nProvider from "@/components/I18nProvider";
import { Toaster } from "sonner";
import DevAxeClient from "@/components/DevAxeClient";
import { getMessages, setRequestLocale } from 'next-intl/server';

/**
 * Marketing Layout
 * 
 * This layout is specifically for marketing pages (landing page, etc.)
 * Unlike the main app layout, this does NOT wrap content in <main>
 * to allow the Landing component to define its own semantic structure
 * with proper landmark nesting:
 * - <nav> at the same level as <main>
 * - <main> containing the primary content
 * - <footer> at the same level as <main>
 */
export default async function MarketingLayout({
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
      {/* Marketing pages handle their own semantic structure */}
      {children}
      <CommandPalette />
      <Toaster />
      <DevAxeClient />
    </I18nProvider>
  );
}

