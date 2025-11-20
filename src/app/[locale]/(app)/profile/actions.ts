'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { encryptProfilePhone, encryptProfileAddress, encryptProfileName } from '@/lib/helpers/profileEncryption'

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

    // Preparar datos para actualización/creación con encriptación
    const profileData: {
      name?: Buffer | null | undefined
      phone?: Buffer | null | undefined
      address?: Buffer | null | undefined
      locale?: LocaleValue
    } = {}

    if (updates.name !== undefined) {
      // Encriptar name antes de guardarlo
      const encryptedName = await encryptProfileName(updates.name);
      profileData.name = encryptedName ?? undefined;
    }

    if (updates.phone !== undefined) {
      // Encriptar phone antes de guardarlo
      const encryptedPhone = await encryptProfilePhone(updates.phone);
      profileData.phone = encryptedPhone ?? undefined;
    }

    if (updates.address !== undefined) {
      // Encriptar address antes de guardarlo
      const encryptedAddress = await encryptProfileAddress(updates.address);
      profileData.address = encryptedAddress ?? undefined;
    }

    if (updates.locale !== undefined) {
      profileData.locale = updates.locale
    }

    if (existingProfile) {
      if (Object.keys(profileData).length > 0) {
        // Filtrar undefined para cumplir con exactOptionalPropertyTypes
        const updateData: any = {};
        if (profileData.name !== undefined) updateData.name = profileData.name;
        if (profileData.phone !== undefined) updateData.phone = profileData.phone;
        if (profileData.address !== undefined) updateData.address = profileData.address;
        if (profileData.locale !== undefined) updateData.locale = profileData.locale;
        
        await prisma.profile.update({
          where: { id: userId },
          data: updateData,
        })
      }
    } else {
      // Filtrar undefined para cumplir con exactOptionalPropertyTypes
      const createData: any = { id: userId };
      if (profileData.name !== undefined) createData.name = profileData.name;
      if (profileData.phone !== undefined) createData.phone = profileData.phone;
      if (profileData.address !== undefined) createData.address = profileData.address;
      if (profileData.locale !== undefined) createData.locale = profileData.locale;
      
      await prisma.profile.create({
        data: createData,
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

/**
 * NOTA ARQUITECTÓNICA:
 * 
 * - updateProfile: Diseñada para useActionState (React 19 Server Actions)
 *   Requiere parámetro _prevState: FormState
 * 
 * - updateProfileDirect: Para llamadas programáticas directas
 *   No requiere estado previo, útil para handlers de eventos
 * 
 * CUÁNDO USAR CADA UNA:
 * - useActionState(...) → updateProfile
 * - await en event handler → updateProfileDirect
 */

/**
 * Versión directa de updateProfile para llamadas sin useActionState.
 * Útil para llamadas programáticas donde no hay un estado previo real.
 * 
 * @param formData - Datos del formulario a actualizar
 * @returns Promise<FormState> - Estado del resultado
 * 
 * @example
 * // En event handler:
 * const result = await updateProfileDirect(formData);
 * if (result.ok) {
 *   toast.success('Updated successfully');
 * } else {
 *   toast.error(result.message);
 * }
 */
export async function updateProfileDirect(
  formData: FormData
): Promise<FormState> {
  // Llamar a updateProfile con un estado inicial dummy
  // El parámetro _prevState no se usa en la implementación
  return updateProfile({ ok: true }, formData);
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
        name: null, // name es opcional y encriptado (BYTEA)
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
