import { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { createServerSupabase } from '@/lib/supabase/server'
import BrikiSidebarLayout from '@/components/BrikiSidebarLayout'

type AppLayoutProps = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function AppLayout({ children, params }: AppLayoutProps) {
  // Extract locale for localized redirects
  const { locale } = await params

  const supabase = await createServerSupabase()

  // Use getUser() for secure authentication check
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    // Build localized login URL with return path for post-login redirect
    const loginUrl = `/${locale}/login`
    const searchParams = new URLSearchParams({
      next: `/${locale}/dashboard`, // Return to dashboard after successful login
    })
    redirect(`${loginUrl}?${searchParams.toString()}`)
  }

  // Render protected content with sidebar shell
  return (
    <BrikiSidebarLayout>
      {children}
    </BrikiSidebarLayout>
  )
}
