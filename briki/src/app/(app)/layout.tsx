import { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { createServerSupabase } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

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

  // Fetch exactly one profile row (SSR) to determine onboarding status
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { onboardingCompleted: true },
  })

  if (!profile || !profile.onboardingCompleted) {
    redirect('/onboarding')
  }

  // Render protected content - no client-side flashing
  return <>{children}</>
}
