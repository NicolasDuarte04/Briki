import I18nProvider from "@/components/I18nProvider";
import { Toaster } from "sonner";
import { getMessages, setRequestLocale } from 'next-intl/server';

/**
 * Layout para la ruta /landing (fuera de [locale])
 * 
 * Esta ruta existe para acceso directo sin prefijo de idioma.
 * Usa 'es' como locale por defecto.
 * 
 * NOTA: No incluye <html> ni <body> porque ya están definidos en el RootLayout.
 */
export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Usar 'es' como locale por defecto para la ruta /landing
  const locale = 'es';
  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <I18nProvider locale={locale} messages={messages}>
      {children}
      <Toaster />
    </I18nProvider>
  );
}
