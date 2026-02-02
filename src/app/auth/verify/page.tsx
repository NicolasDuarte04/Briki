import { redirect } from 'next/navigation'

/**
 * Legacy redirect: /auth/verify -> /verify
 * 
 * Esta página existe para manejar enlaces antiguos o bookmarks
 * que apunten a la ruta anterior /auth/verify.
 * Redirige automáticamente a la nueva ubicación bajo [locale]/(auth)/verify.
 */
export default function LegacyVerifyRedirect() {
  redirect('/verify')
}