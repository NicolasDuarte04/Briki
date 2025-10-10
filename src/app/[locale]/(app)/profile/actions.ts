'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

import { type LocaleValue } from './schema'

export type FormState = { ok: true } | { ok: false; message: string }

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function updateProfile(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return { ok: false, message: 'unauthorized' }
    }

    const updates: Partial<Record<'name' | 'phone' | 'address', string | null>> & {
      locale?: LocaleValue
    } = {}

    if (formData.has('name')) {
      const rawName = formData.get('name')
      if (typeof rawName !== 'string') {
        return { ok: false, message: 'invalid name' }
      }
      const name = rawName.trim()
      if (!name) {
        return { ok: false, message: 'Name is required' }
      }
      if (name.length > 80) {
        return { ok: false, message: 'Name must be 80 characters or less' }
      }
      updates.name = name
    }

    if (formData.has('phone')) {
      const rawPhone = formData.get('phone')
      if (typeof rawPhone !== 'string') {
        return { ok: false, message: 'invalid phone' }
      }
      const phone = rawPhone.trim()
      if (phone.length > 40) {
        return { ok: false, message: 'Phone must be 40 characters or less' }
      }
      updates.phone = phone.length ? phone : null
    }

    if (formData.has('address')) {
      const rawAddress = formData.get('address')
      if (typeof rawAddress !== 'string') {
        return { ok: false, message: 'invalid address' }
      }
      const address = rawAddress.trim()
      if (address.length > 200) {
        return { ok: false, message: 'Address must be 200 characters or less' }
      }
      updates.address = address.length ? address : null
    }

    if (formData.has('locale')) {
      const rawLocale = formData.get('locale')
      if (rawLocale === 'en' || rawLocale === 'es') {
        updates.locale = rawLocale
      } else if (rawLocale !== null) {
        return { ok: false, message: 'Invalid locale provided' }
      }
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { id: true, locale: true },
    })

    if (existingProfile) {
      if (Object.keys(updates).length > 0) {
        await prisma.profile.update({
          where: { id: userId },
          data: updates,
        })
      }
    } else {
      await prisma.profile.create({
        data: {
          id: userId,
          ...updates,
        },
      })
    }

    const localeForPath =
      updates.locale ?? existingProfile?.locale ?? 'en'
    revalidatePath(`/${localeForPath}/profile`)

    return { ok: true }
  } catch (error) {
    console.error('Update profile error:', error)
    return { ok: false, message: 'unknown error' }
  }
}

export async function updateNotificationSettings(
  formData: FormData
): Promise<{ status: 'success' | 'error'; error?: string }> {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return { status: 'error', error: 'unauthorized' }
    }

    // Read boolean values from formData (checkbox "on" -> true, otherwise false)
    const productUpdates = formData.get('productUpdates') === 'on'
    const policyAlerts = formData.get('policyAlerts') === 'on'

    // Get locale for revalidation
    const rawLocale = formData.get('locale')
    const locale = typeof rawLocale === 'string' && (rawLocale === 'en' || rawLocale === 'es')
      ? rawLocale
      : 'en'

    // Update notification preferences
    await prisma.profile.upsert({
      where: { id: userId },
      update: {
        notificationsProductUpdates: productUpdates,
        notificationsPolicyAlerts: policyAlerts,
      },
      create: {
        id: userId,
        name: '',
        notificationsProductUpdates: productUpdates,
        notificationsPolicyAlerts: policyAlerts,
      },
    })

    // Revalidate profile route to refresh UI
    revalidatePath(`/${locale}/profile`)

    return { status: 'success' }
  } catch (error) {
    console.error('Update notification settings error:', error)
    return { status: 'error', error: 'unknown' }
  }
}

export async function requestPasswordReset(
  _prevState: unknown,
  formData: FormData
): Promise<{ status: 'success' | 'error'; error?: string }> {
  try {
    const email = formData.get('email') as string
    const locale = (formData.get('locale') as string) || 'en'

    if (!email) {
      return { status: 'error', error: 'Email is required.' }
    }

    const supabase = await createServerSupabase()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${
        process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      }/${locale}/auth/update-password`,
    })

    if (error) {
      console.error('Password reset error:', error)
      return { status: 'error', error: error.message }
    }

    return { status: 'success' }
  } catch (error) {
    console.error('Unexpected password reset error:', error)
    return { status: 'error', error: 'An unexpected error occurred' }
  }
}
