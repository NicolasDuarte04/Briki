import { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { createServerSupabase } from '@/lib/supabase/server'

type AppLayoutProps = {
  children: ReactNode
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await createServerSupabase()

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', session.user.id)
    .single()

  if (profileError || !profile?.onboarding_completed) {
    redirect('/onboarding')
  }

  return <>{children}</>
}
