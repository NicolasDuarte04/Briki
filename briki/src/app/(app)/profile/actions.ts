'use server'

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

    const candidate = {
      name: typeof rawName === 'string' ? rawName : '',
      locale: typeof rawLocale === 'string' ? rawLocale : '',
    }

    const parsed = ProfileInputSchema.safeParse(candidate)

    if (!parsed.success) {
      const errors: FormErrors = {}

      for (const issue of parsed.error.issues) {
        const field = issue.path[0]

        if (field === 'name') {
          errors.name = 'required'
        }
        if (field === 'locale') {
          errors.locale = 'invalidUnion'
        }
      }

      return {
        status: 'error',
        errors,
        values: { name: candidate.name, locale: coerceLocale(candidate.locale) },
      }
    }

    const { name, locale } = parsed.data

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { name } }),
      prisma.profile.upsert({
        where: { userId },
        update: { name, locale },
        create: { userId, name, locale },
      }),
    ])

    return { status: 'success' }
  } catch (error) {
    console.error('Update profile error:', error)
    return { status: 'error', formError: 'unknown' }
  }
}

export type { FormState }
