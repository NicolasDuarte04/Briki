import Landing from "@/components/Landing";

/**
 * Página /landing dentro del sistema i18n
 * 
 * Rutas resultantes:
 * - /landing → Inglés (locale por defecto, sin prefijo por localePrefix: 'as-needed')
 * - /es/landing → Español
 * 
 * El locale se resuelve automáticamente por el sistema [locale]:
 * 1. URL prefix (si existe)
 * 2. Cookie BRIKI_LOCALE
 * 3. Default 'en'
 */
export default function LandingPage() {
  return <Landing />;
}
