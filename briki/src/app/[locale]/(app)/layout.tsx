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

  // Render protected content - no client-side flashing
  return <>{children}</>
}
