import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { encryptProfileName } from '@/lib/helpers/profileEncryption'

/**
 * OAuth Callback Route Handler
 * 
 * Este handler procesa el callback de OAuth (Google, etc.) después de que
 * el usuario se autentica con el proveedor externo.
 * 
 * Flujo:
 * 1. Intercambia el código por una sesión válida
 * 2. Crea/actualiza el profile del usuario
 * 3. Crea organización y membership si no existen (paridad con signup email)
 * 4. Redirige según estado de onboarding
 */
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')

  console.log('🔐 [OAuth Callback] Procesando callback...', { hasCode: !!code })

  if (!code) {
    console.error('❌ [OAuth Callback] No se proporcionó código de autenticación')
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: system-ui; padding: 2rem; text-align: center; }
            a { color: #0066cc; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>Authentication Error</h1>
          <p>No authentication code was provided.</p>
          <p><a href="/login">Return to Login</a></p>
        </body>
      </html>`,
      {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }

  const supabase = await createServerSupabase()
  
  // 1. Intercambiar código por sesión
  console.log('🔄 [OAuth Callback] Intercambiando código por sesión...')
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  
  if (exchangeError) {
    console.error('❌ [OAuth Callback] Error al intercambiar código:', exchangeError)
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: system-ui; padding: 2rem; text-align: center; }
            a { color: #0066cc; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>Authentication Error</h1>
          <p>Failed to authenticate. Please try again.</p>
          <p><a href="/login">Return to Login</a></p>
        </body>
      </html>`,
      {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }

  // 2. Obtener usuario autenticado
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.error('❌ [OAuth Callback] No se pudo obtener información del usuario')
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: system-ui; padding: 2rem; text-align: center; }
            a { color: #0066cc; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>Authentication Error</h1>
          <p>Unable to retrieve user information.</p>
          <p><a href="/login">Return to Login</a></p>
        </body>
      </html>`,
      {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }

  console.log('✅ [OAuth Callback] Usuario autenticado:', { userId: user.id, email: user.email })

  try {
    // 3. Verificar si el usuario ya tiene membership (indicador de setup completo)
    const existingMembership = await prisma.org_members.findFirst({
      where: { user_id: user.id }
    })

    if (existingMembership) {
      // Usuario existente - solo asegurar que profile existe
      console.log('ℹ️ [OAuth Callback] Usuario existente con membership, verificando profile...')
      
  const profile = await prisma.profile.upsert({
    where: { id: user.id },
        update: {}, // No actualizamos nada si ya existe
    create: {
      id: user.id,
          name: null,
      locale: 'en'
    }
  })

      // Redirigir según estado de onboarding
      if (!profile.onboardingCompleted) {
        console.log('➡️ [OAuth Callback] Redirigiendo a onboarding...')
        redirect('/onboarding')
      } else {
        console.log('➡️ [OAuth Callback] Redirigiendo a dashboard...')
        redirect('/dashboard')
      }
    }

    // 4. Usuario nuevo - crear profile, organización y membership en transacción
    console.log('🆕 [OAuth Callback] Usuario nuevo, creando entidades...')
    
    // Encriptar email como nombre inicial del perfil
    let encryptedName: Uint8Array<ArrayBuffer> | null = null
    try {
      encryptedName = await encryptProfileName(user.email) as Uint8Array<ArrayBuffer> | null
      console.log('✅ [OAuth Callback] Email encriptado como nombre')
    } catch (encryptError) {
      console.warn('⚠️ [OAuth Callback] Error encriptando email, usando null:', encryptError)
      // Continuamos con null - no es crítico
    }

    // Transacción atómica: Profile + Organization + Membership
    const profile = await prisma.$transaction(async (tx) => {
      // 4.1 Crear profile
      console.log('  📝 [OAuth Callback] Creando profile...')
      const newProfile = await tx.profile.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          name: encryptedName,
          locale: 'en'
        }
      })

      // 4.2 Crear organización por defecto
      console.log('  🏢 [OAuth Callback] Creando organización...')
      const orgSlug = `personal-${user.id.substring(0, 8)}`
      const orgName = `${user.email}'s Workspace`

      const newOrg = await tx.organizations.create({
        data: {
          name: orgName,
          slug: orgSlug,
        },
      })
      console.log('  ✅ [OAuth Callback] Organización creada:', { orgId: newOrg.id, slug: orgSlug })

      // 4.3 Crear membership como owner
      console.log('  👤 [OAuth Callback] Creando membership...')
      await tx.org_members.create({
        data: {
          org_id: newOrg.id,
          user_id: user.id,
          role: 'owner',
        },
      })
      console.log('  ✅ [OAuth Callback] Membership creada como owner')

      return newProfile
    }, {
      timeout: 30000,
      maxWait: 5000
    })

    console.log('✅ [OAuth Callback] Transacción completada exitosamente')

    // 5. Redirigir según estado de onboarding
  if (!profile.onboardingCompleted) {
      console.log('➡️ [OAuth Callback] Redirigiendo a onboarding...')
      redirect('/onboarding')
    } else {
      console.log('➡️ [OAuth Callback] Redirigiendo a dashboard...')
      redirect('/dashboard')
    }

  } catch (dbError) {
    console.error('❌ [OAuth Callback] Error en base de datos:', dbError)
    
    // En caso de error de DB, intentamos un fallback que SIEMPRE crea org
    // para garantizar que el usuario nunca quede sin organización
    try {
      // 1. Crear/asegurar profile
      const fallbackProfile = await prisma.profile.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          name: null,
          locale: 'en'
        }
      })

      // 2. CRÍTICO: Verificar si tiene membership, si no, crear org + membership
      const existingMembership = await prisma.org_members.findFirst({
        where: { user_id: user.id }
      })

      if (!existingMembership) {
        console.log('⚠️ [OAuth Callback] Usuario sin membership en fallback, creando org...')
        const orgSlug = `personal-${user.id.substring(0, 8)}`
        const orgName = `${user.email}'s Workspace`

        const newOrg = await prisma.organizations.create({
          data: {
            name: orgName,
            slug: orgSlug,
          },
        })

        await prisma.org_members.create({
          data: {
            org_id: newOrg.id,
            user_id: user.id,
            role: 'owner',
          },
        })
        console.log('✅ [OAuth Callback] Org creada en fallback:', { orgId: newOrg.id })
      }

      if (!fallbackProfile.onboardingCompleted) {
        redirect('/onboarding')
      } else {
        redirect('/dashboard')
      }
    } catch (fallbackError) {
      console.error('❌ [OAuth Callback] Error crítico en fallback:', fallbackError)
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Setup Error</title>
            <style>
              body { font-family: system-ui; padding: 2rem; text-align: center; }
              a { color: #0066cc; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <h1>Account Setup Error</h1>
            <p>We couldn't complete your account setup. Please try again.</p>
            <p><a href="/login">Return to Login</a></p>
          </body>
        </html>`,
        {
          status: 500,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }
  }
}
