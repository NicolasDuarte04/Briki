import { redirect } from 'next/navigation'

/**
 * Legacy redirect: /auth/error -> /auth-error
 * 
 * Esta página existe para manejar enlaces antiguos o bookmarks
 * que apunten a la ruta anterior /auth/error.
 * Redirige automáticamente a la nueva ubicación bajo [locale]/(auth)/auth-error.
 */
export default function LegacyErrorRedirect() {
  redirect('/auth-error')
}
