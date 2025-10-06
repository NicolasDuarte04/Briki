'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

import {
  ProfileInputSchema,
  type FormErrors,
  type FormState,
  type LocaleValue,
} from './schema'

function coerceLocale(value: unknown): LocaleValue {
  return value === 'es' ? 'es' : 'en'
}

async function getCurrentSession() {
  const supabase = await createServerSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session ?? null
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getCurrentSession()
  return session?.user?.id ?? null
}

export async function updateProfile(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return { status: 'error', formError: 'unauthorized' }
    }

    const rawName = formData.get('name')
    const rawLocale = formData.get('locale')

    // Parse name (required, trimmed)
    const name = typeof rawName === 'string' ? rawName.trim() : ''
    
    if (!name) {
      return {
        status: 'error',
        errors: { name: 'required' },
        values: { name: '', locale: coerceLocale(rawLocale) },
      }
    }

    // Parse locale (optional)
    const locale = typeof rawLocale === 'string' && (rawLocale === 'en' || rawLocale === 'es')
      ? rawLocale
      : undefined

    // Build update/create data conditionally
    const updateData: { name: string; locale?: string } = { name }
    const createData: { id: string; name: string; locale?: string } = { id: userId, name }
    
    if (locale) {
      updateData.locale = locale
      createData.locale = locale
    }

    await prisma.profile.upsert({
      where: { id: userId },
      update: updateData,
      create: createData,
    })

    // Revalidate profile route to refresh UI
    const profileLocale = locale ?? 'en'
    revalidatePath(`/${profileLocale}/profile`)

    return { status: 'success' }
  } catch (error) {
    console.error('Update profile error:', error)
    return { status: 'error', formError: 'unknown' }
  }
}

export async function requestPasswordReset(
  _prevState: { status?: 'success' | 'error' } | null,
  formData: FormData
): Promise<{ status: 'success' | 'error' }> {
  try {
    const email = formData.get('email')

    if (!email || typeof email !== 'string') {
      return { status: 'error' }
    }

    const supabase = await createServerSupabase()
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/profile`,
    })

    if (error) {
      console.error('Password reset error:', error)
      return { status: 'error' }
    }

    return { status: 'success' }
  } catch (error) {
    console.error('Password reset error:', error)
    return { status: 'error' }
  }
}

export type { FormState }
