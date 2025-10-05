'use server'

import { redirect } from 'next/navigation'

import { createServerSupabase } from '@/lib/supabase/server'

export async function completeOnboarding() {
  const supabase = createServerSupabase()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('completeOnboarding: failed to load authenticated user', userError)
    redirect('/login')
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', user.id)

  if (updateError) {
    console.error('completeOnboarding: failed to mark onboarding complete', updateError)
    throw new Error('Unable to complete onboarding at this time.')
  }

  redirect('/app')
}

export async function completeOnboardingAction(_formData: FormData) {
  await completeOnboarding()
}
