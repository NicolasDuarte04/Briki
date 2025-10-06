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

    // Validate the next path. It must be a relative path.
    const isValidNextPath = next && next.startsWith('/') && !next.startsWith('//')

    if (isValidNextPath) {
      redirect(next)
    }

    // After a successful login, always redirect to the landing page.
    redirect('/')

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

export async function requestPasswordReset(formData?: FormData): Promise<ActionResult> {
  const supabase = await createServerSupabase()

  try {
    // Get the current user session
    const { data: { user }, error: sessionError } = await supabase.auth.getUser()

    if (sessionError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Send password reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      user.email!,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/reset`
      }
    )

    if (resetError) {
      console.error('Password reset error:', resetError)
      return { success: false, error: resetError.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected password reset error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
