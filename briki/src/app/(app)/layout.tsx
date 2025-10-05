import { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { createServerSupabase } from '@/lib/supabase/server'

type AppLayoutProps = {
  children: ReactNode
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await createServerSupabase()

  // Use getUser() for secure authentication check
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Fetch profile by user id - single query
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  // Redirect to onboarding if profile doesn't exist or onboarding is incomplete
  if (profileError || !profile || profile.onboarding_completed !== true) {
    redirect('/onboarding')
  }

  // Render protected content - no client-side flashing
  return <>{children}</>
}
