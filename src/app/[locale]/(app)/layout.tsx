import { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { createServerSupabase } from '@/lib/supabase/server'
import BrikiSidebarLayout from '@/components/BrikiSidebarLayout'
import OrgStateSync from '@/components/Workspace/OrgStateSync'
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg'

type AppLayoutProps = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function AppLayout({ children, params }: AppLayoutProps) {
  // 🔍 DEBUG: Log al inicio del layout
  console.log('🔍 [AppLayout] SSR - Inicio del layout');

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

  // ✅ NUEVO: Obtener la organización actual para sincronizar el estado del cliente
  let orgId: string | null = null;
  try {
    const { currentOrg } = await getCurrentOrg();
    orgId = currentOrg?.id || null;
  } catch (error) {
    // Si falla getCurrentOrg, dejar que el usuario continúe
    // (podría estar en onboarding de organización)
    console.warn('Could not get current org in layout:', error);
  }

  // 🔍 DEBUG: Log antes de renderizar
  console.log('🔍 [AppLayout] SSR - Renderizando children con:', {
    locale,
    userId: user.id,
    orgId,
    childrenType: typeof children,
    childrenIsArray: Array.isArray(children),
  });

  // Render protected content with sidebar shell
  return (
    <BrikiSidebarLayout>
      {/* ✅ Componente vigilante para sincronizar estado con la organización activa */}
      {orgId && <OrgStateSync orgId={orgId} />}
      {children}
    </BrikiSidebarLayout>
  )
}
