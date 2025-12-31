import { NextRequest, NextResponse } from 'next/server'

/**
 * DEPRECATED: Este callback está obsoleto.
 * 
 * La ruta canónica de callback OAuth es /auth/callback (sin /api).
 * Este handler redirige a la ruta correcta para mantener compatibilidad
 * con cualquier configuración existente en Supabase Dashboard o enlaces previos.
 * 
 * TODO: Una vez confirmado que todo funciona correctamente con /auth/callback,
 * actualizar la configuración de Supabase Dashboard y eliminar este archivo.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  
  console.log('⚠️ [DEPRECATED /api/auth/callback] Redirigiendo a /auth/callback...')
  
  // Construir URL de redirect preservando query params
  const redirectUrl = new URL('/auth/callback', requestUrl.origin)
  
  if (code) {
    redirectUrl.searchParams.set('code', code)
  }
  if (next) {
    redirectUrl.searchParams.set('next', next)
  }
  
  return NextResponse.redirect(redirectUrl)
}
