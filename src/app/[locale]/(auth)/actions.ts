'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import type { AuthError } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { encryptProfileName } from '@/lib/helpers/profileEncryption'

export type ActionResult<T = void> = 
  | { success: true; data?: T }
  | { success: false; error: string }

export async function signup(formData: FormData): Promise<ActionResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  console.log('🔐 [SIGNUP] Inicio del proceso de registro', { email })

  // Basic validation
  if (!email || !password) {
    console.error('❌ [SIGNUP] Validación fallida: email o password faltantes')
    return { success: false, error: 'Email and password are required' }
  }

  const supabase = await createServerSupabase()

  try {
    // 1. CREAR USUARIO EN SUPABASE AUTH
    console.log('📝 [SIGNUP] Paso 1: Creando usuario en Supabase Auth...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
      // emailRedirectTo is not needed since email confirmation is disabled
    })

    if (authError) {
      console.error('❌ [SIGNUP] Error en Supabase Auth:', authError)
      // Handle common error cases
      if (authError.message.includes('already registered')) {
        return { success: false, error: 'An account with this email already exists' }
      }
      if (authError.message.includes('password')) {
        return { success: false, error: 'Password must be at least 6 characters' }
      }
      return { success: false, error: authError.message }
    }

    // If signup is successful and email confirmation is disabled,
    // a user and session object will be returned.
    if (!authData.user) {
      console.error('❌ [SIGNUP] Usuario no creado en authData')
      return { success: false, error: 'Failed to create an account. Please try again.' }
    }

    console.log('✅ [SIGNUP] Usuario creado en Supabase Auth', { userId: authData.user.id })

        console.log('✅ [SIGNUP] Usuario creado en Supabase Auth', { userId: authData.user.id })

    // If no session, email confirmation is enabled - redirect to verify page
    if (!authData.session) {
      console.log('ℹ️ [SIGNUP] No hay sesión, redirigiendo a verificación')
      redirect(`/verify?email=${encodeURIComponent(email)}`)
    }

    // Capturar user en variable local para preservar type narrowing en callbacks
    const user = authData.user

    // 2. ENCRIPTAR EMAIL COMO NOMBRE (ANTES DE LA TRANSACCIÓN)
    console.log('🔐 [SIGNUP] Paso 2: Encriptando email como nombre...')
    let encryptedName: Uint8Array<ArrayBuffer> | null
    
    try {
      encryptedName = await encryptProfileName(user.email) as Uint8Array<ArrayBuffer> | null
      console.log('✅ [SIGNUP] Email encriptado exitosamente', {
        length: encryptedName?.length || 0
      })
    } catch (encryptError) {
      console.error('❌ [SIGNUP] Error en encriptación:', encryptError)
      console.error('❌ [SIGNUP] Detalles del error de encriptación:', {
        name: (encryptError as Error)?.name,
        message: (encryptError as Error)?.message,
        stack: (encryptError as Error)?.stack?.split('\n').slice(0, 5).join('\n')
      })
      return { success: false, error: 'Encryption error during registration.' }
    }

    // 3. CREAR PROFILE + ORGANIZACIÓN + MEMBERSHIP EN TRANSACCIÓN ATÓMICA
    console.log('🔄 [SIGNUP] Paso 3: Iniciando transacción de base de datos...')
    
    try {
      await prisma.$transaction(async (tx) => {
        // 3.1 Crear profile con email encriptado como name
        console.log('  📝 [SIGNUP] 3.1: Creando/actualizando profile...')
        await tx.profile.upsert({
          where: { id: user.id },
          update: {},
          create: {
            id: user.id,
            name: encryptedName,
            locale: 'en'
          }
        })
        console.log('  ✅ [SIGNUP] Profile creado/actualizado')

        // 3.2 Crear organización por defecto
        console.log('  🏢 [SIGNUP] 3.2: Creando organización...')
        const orgSlug = `personal-${user.id.substring(0, 8)}`
        const orgName = `${user.email}'s Workspace`

        const newOrg = await tx.organizations.create({
          data: {
            name: orgName,
            slug: orgSlug,
          },
        })
        console.log('  ✅ [SIGNUP] Organización creada', { orgId: newOrg.id, slug: orgSlug })

        // 3.3 Crear membership como owner
        console.log('  👤 [SIGNUP] 3.3: Creando membership...')
        await tx.org_members.create({
          data: {
            org_id: newOrg.id,
            user_id: user.id,
            role: 'owner',
          },
        })
        console.log('  ✅ [SIGNUP] Membership creada')
      }, {
        timeout: 30000,
        maxWait: 5000
      })

      console.log('✅ [SIGNUP] Transacción completada exitosamente')
      
    } catch (dbError) {
      console.error('❌ [SIGNUP] Error en transacción de base de datos:', dbError)
      console.error('❌ [SIGNUP] Detalles del error:', {
        name: (dbError as Error)?.name,
        message: (dbError as Error)?.message,
        code: (dbError as any)?.code,
        meta: (dbError as any)?.meta,
        stack: (dbError as Error)?.stack?.split('\n').slice(0, 5).join('\n')
      })
      return { 
        success: false, 
        error: 'Database error saving new user. Please try again or contact support.' 
      }
    }

    // 4. LIMPIAR CACHÉ Y REDIRIGIR
    console.log('🧹 [SIGNUP] Paso 4: Limpiando caché y redirigiendo...')
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')

    console.log('✅ [SIGNUP] Registro completado exitosamente, redirigiendo a /')
    // Redirect to landing page (shows authenticated navbar)
    redirect('/')
  } catch (error) {
    // If the error is a redirect error, re-throw it so Next.js can handle it
    if (error && typeof error === 'object' && 'digest' in error && error.digest?.toString().startsWith('NEXT_REDIRECT')) {
      throw error
    }

    console.error('❌ [SIGNUP] Error inesperado:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function login(formData: FormData): Promise<ActionResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const next = formData.get('next') as string | null

  // Basic validation
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' }
  }

  const supabase = await createServerSupabase()

  try {
    // Sign in the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      // Handle common error cases
      if (authError.message.includes('Invalid login credentials')) {
        return { success: false, error: 'Invalid email or password' }
      }
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to sign in' }
    }

    // Capturar user en variable local para preservar type narrowing
    const user = authData.user;
    
    // Encriptar email como nombre inicial del perfil
    const encryptedName = await encryptProfileName(user.email);

    // Backfill profile if missing (idempotent)
    await prisma.profile.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        name: encryptedName as Uint8Array<ArrayBuffer> | null,
        locale: 'en'
      }
    });

    // Verificar si el usuario tiene al menos una organización
    const existingMembership = await prisma.org_members.findFirst({
      where: { user_id: user.id }
    });

    // Si no tiene organización, crear una por defecto en transacción
    if (!existingMembership) {
      try {
        await prisma.$transaction(async (tx) => {
          const orgSlug = `personal-${user.id.substring(0, 8)}`;
          const orgName = `${user.email}'s Workspace`;

          const newOrg = await tx.organizations.create({
            data: {
              name: orgName,
              slug: orgSlug,
            },
          });

          await tx.org_members.create({
            data: {
              org_id: newOrg.id,
              user_id: user.id,
              role: 'owner',
            },
          });
        });
      } catch (orgError) {
        console.error('Failed to create organization for existing user:', authData.user.id, orgError);
        return { 
          success: false, 
          error: 'Failed to create workspace. Please try again or contact support.' 
        };
      }
    }

    // Clear any cached data before redirecting
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')

    // ✅ Whitelist de rutas permitidas para ?next=
    // Rutas que pueden ser destino válido después de login
    const ALLOWED_NEXT_ROUTES = [
      '/dashboard',
      '/profile',
      '/workspace/cases',
      '/workspace/clients',
      '/workspace/policies',
      '/workspace/proposals',
      '/workspace/comparisons',
      '/workspace/renewals',
      '/workspace/analyses',
      // ❌ Intencionalmente excluido: /agent/new-thread-placeholder
      // ❌ Intencionalmente excluido: /agent/{uuid} (por ahora)
    ];

    /**
     * Valida si una ruta es permitida como destino de ?next=
     * @param nextPath - Ruta a validar
     * @returns true si la ruta está en la whitelist, false en caso contrario
     */
    const isAllowedNextRoute = (nextPath: string | null): boolean => {
      if (!nextPath || typeof nextPath !== 'string') {
        return false;
      }
      
      // Validación de sintaxis (prevenir open redirects)
      if (!nextPath.startsWith('/') || nextPath.startsWith('//')) {
        return false;
      }
      
      // Normalizar ruta (remover locale prefix si existe)
      const normalizedPath = nextPath.replace(/^\/(es|en)/, '');
      
      // Verificar contra whitelist (prefix matching para permitir subrutas)
      return ALLOWED_NEXT_ROUTES.some(allowedRoute => 
        normalizedPath === allowedRoute || normalizedPath.startsWith(allowedRoute + '/')
      );
    };

    // ✅ Validar next contra whitelist
    if (next && isAllowedNextRoute(next)) {
      console.log(`✅ [LOGIN] Redirigiendo a destino válido: ${next}`);
      redirect(next);
    }

    // ✅ Fallback mejorado: ir directo a dashboard (evitar hop del middleware)
    if (next) {
      console.log(`⚠️ [LOGIN] Ruta rechazada por whitelist: ${next}, redirigiendo a dashboard`);
    } else {
      console.log(`ℹ️ [LOGIN] Sin parámetro next, redirigiendo a dashboard`);
    }
    
    redirect('/dashboard')

  } catch (error) {
    // If the error is a redirect error, re-throw it so Next.js can handle it
    if (error && typeof error === 'object' && 'digest' in error && error.digest?.toString().startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error('Login error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Inicia el flujo de autenticación OAuth con el proveedor especificado.
 * 
 * NOTA: Esta función es un Server Action para casos donde se necesite
 * iniciar OAuth desde el servidor. Para uso client-side, se recomienda
 * usar directamente createBrowserSupabase().auth.signInWithOAuth()
 * como se hace en LoginForm.tsx.
 * 
 * @param provider - El proveedor OAuth ('google')
 * @returns ActionResult con el resultado de la operación
 */
export async function signInWithOAuth(provider: 'google') {
  const supabase = await createServerSupabase()
  
  // Usar /auth/callback (consolidado) en lugar de /api/auth/callback
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const redirectTo = `${siteUrl}/auth/callback`
  
  console.log('🔐 [signInWithOAuth] Iniciando OAuth...', { provider, redirectTo })
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    console.error('❌ [signInWithOAuth] Error:', error)
    return { success: false, error: error.message }
  }

  if (data.url) {
    console.log('✅ [signInWithOAuth] Redirigiendo a:', data.url)
    redirect(data.url)
  }

  return { success: false, error: 'Failed to get OAuth URL' }
}

export async function signOut(): Promise<ActionResult> {
  const supabase = await createServerSupabase()

  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Supabase signOut error:', error)
      return { success: false, error: error.message }
    }

    // Clear any cached data before redirecting
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')

    redirect('/')
  } catch (error) {
    // If the error is a redirect error, re-throw it so Next.js can handle it
    if (error && typeof error === 'object' && 'digest' in error && error.digest?.toString().startsWith('NEXT_REDIRECT')) {
      throw error
    }

    console.error('Sign out error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function updatePassword(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const password = formData.get('password') as string
  const locale = formData.get('locale') as string || 'en'

  // Basic validation
  if (!password) {
    return { ok: false, error: 'Password is required' }
  }

  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters' }
  }

  const supabase = await createServerSupabase()

  try {
    // Update the user's password
    const { error } = await supabase.auth.updateUser({
      password
    })

    if (error) {
      console.error('Password update error:', error)
      return { ok: false, error: error.message }
    }

    // Clear any cached data before redirecting
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')

    // Redirect to the landing page with the user's locale
    redirect(`/${locale}`)
  } catch (error) {
    // If the error is a redirect error, re-throw it so Next.js can handle it
    if (error && typeof error === 'object' && 'digest' in error && error.digest?.toString().startsWith('NEXT_REDIRECT')) {
      throw error
    }

    console.error('Update password error:', error)
    return { ok: false, error: 'An unexpected error occurred' }
  }
}
