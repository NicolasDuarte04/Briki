'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import type { AuthError } from '@supabase/supabase-js'

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
    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
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

    if (!authData.user) {
      return { success: false, error: 'Failed to create account' }
    }

    // The user's profile is now automatically created by a database trigger
    // so we can remove the manual profile creation from the signup function.

    // Since onboarding_completed is false by default, redirect to onboarding
    redirect('/onboarding')
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

    // Fetch the user's profile to check onboarding status
    // This is done server-side outside of middleware (Node.js only)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      // If profile doesn't exist or error, redirect to onboarding to be safe
      redirect('/onboarding')
    }

    // Redirect based on onboarding status
    if (profile?.onboarding_completed) {
      // Redirect to app home (adjust path as needed)
      redirect('/app')
    } else {
      // Redirect to onboarding
      redirect('/onboarding')
    }
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
