'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import type { AuthError } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

export type ActionResult<T = void> = 
  | { success: true; data?: T }
  | { success: false; error: string }

export async function signup(formData: FormData): Promise<ActionResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Basic validation
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' }
  }

  const supabase = await createServerSupabase()

  try {
    // Sign up the user with email redirect
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
      // emailRedirectTo is not needed since email confirmation is disabled
    })

    if (authError) {
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
      return { success: false, error: 'Failed to create an account. Please try again.' }
    }

    // If no session, email confirmation is enabled - redirect to verify page
    if (!authData.session) {
      redirect('/auth/verify')
    }

    // Create profile using Prisma upsert for robustness (idempotent)
    await prisma.profile.upsert({
      where: { id: authData.user.id },
      update: {},
      create: {
        id: authData.user.id,
        name: null,
        locale: 'en'
      }
    })

    // Paso 3: Crear una organización por defecto para el nuevo usuario.
    // Esto es crucial para la arquitectura multi-tenant desde el inicio.
    try {
      const orgSlug = `personal-${authData.user.id.substring(0, 8)}`;
      const orgName = `${authData.user.email}'s Workspace`;

      const newOrg = await prisma.organizations.create({
        data: {
          name: orgName,
          slug: orgSlug,
        },
      });

      await prisma.org_members.create({
        data: {
          org_id: newOrg.id,
          user_id: authData.user.id,
          role: 'owner',
        },
      });
    } catch (orgError) {
      // Si la creación de la organización falla, se debe considerar un rollback
      // o registrar un error crítico. Por ahora, lo logueamos.
      console.error('CRITICAL: Failed to create default organization for user:', authData.user.id, orgError);
    }

    // Clear any cached data before redirecting
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')

    // Redirect to landing page (shows authenticated navbar)
    redirect('/')
  } catch (error) {
    // If the error is a redirect error, re-throw it so Next.js can handle it
    if (error && typeof error === 'object' && 'digest' in error && error.digest?.toString().startsWith('NEXT_REDIRECT')) {
      throw error
    }

    console.error('Signup error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function login(formData: FormData): Promise<ActionResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const locale = (formData.get('locale') as string) || 'en'
  const nextParam = formData.get('next') as string
  // Use next param if valid (must be relative path), otherwise default to dashboard
  const next = (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) 
    ? nextParam 
    : `/${locale}/dashboard`

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

    // Backfill profile if missing (idempotent)
    await prisma.profile.upsert({
      where: { id: authData.user.id },
      update: {},
      create: {
        id: authData.user.id,
        name: null,
        locale: 'en'
      }
    })

    // Verificar si el usuario tiene al menos una organización
    const existingMembership = await prisma.org_members.findFirst({
      where: { user_id: authData.user.id }
    });

    // Si no tiene organización, crear una por defecto
    if (!existingMembership) {
      try {
        const orgSlug = `personal-${authData.user.id.substring(0, 8)}`;
        const orgName = `${authData.user.email}'s Workspace`;

        const newOrg = await prisma.organizations.create({
          data: {
            name: orgName,
            slug: orgSlug,
          },
        });

        await prisma.org_members.create({
          data: {
            org_id: newOrg.id,
            user_id: authData.user.id,
            role: 'owner',
          },
        });
      } catch (orgError) {
        console.error('Failed to create organization for existing user:', authData.user.id, orgError);
      }
    }

    // Clear any cached data before redirecting
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')

    // Redirect to next param or dashboard
    redirect(next)

  } catch (error) {
    // If the error is a redirect error, re-throw it so Next.js can handle it
    if (error && typeof error === 'object' && 'digest' in error && error.digest?.toString().startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error('Login error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Helper function to handle OAuth sign in (for future use)
export async function signInWithOAuth(provider: 'google') {
  const supabase = await createServerSupabase()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (data.url) {
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
