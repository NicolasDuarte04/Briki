import { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { createServerSupabase } from '@/lib/supabase/server'
import BrikiSidebarLayout from '@/components/BrikiSidebarLayout'
import AgentSidebar from '@/components/AgentSidebar'
import { env } from '@/lib/env'

type AppLayoutProps = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

/**
 * IN-APP LAYOUT WITH SERVER-SIDE AUTH GUARD
 * 
 * Provider Inheritance (from parent layouts):
 * ============================================
 * This layout inherits ALL providers from parent layouts through React's component tree:
 * 
 * 1. ✅ AuthProvider (from /app/layout.tsx)
 *    - Provides: useAuth() hook with user, session, status, ready
 *    - Used by: BrikiChat, LandingNavigation, ConversationPane, CommandPalette
 *    - Scopes: Authentication state, user identity
 * 
 * 2. ✅ LoadingProvider (from /app/layout.tsx)
 *    - Provides: useLoading() hook with isLoading, startLoading, stopLoading
 *    - Used by: Global loading screen, navigation transitions
 * 
 * 3. ✅ I18nProvider (from /app/[locale]/layout.tsx)
 *    - Provides: useTranslations(), useLocale() hooks from next-intl
 *    - Used by: All components with translation needs (chat, sourcing, forms)
 * 
 * State Management (No Providers Needed):
 * ========================================
 * 4. ✅ useUI() - Zustand store (global state, no provider required)
 *    - Provides: UI state, step navigation, sourcing state, cases, briefing
 *    - Used by: HomeClient, ConversationPane, CommandPalette, all agent components
 * 
 * 5. ✅ useChatStore() - Zustand store (global state, no provider required)
 *    - Provides: Conversations, messages, active conversation management
 *    - Used by: BrikiChat, SidebarChatPanel, ConversationPane
 * 
 * Additional Capabilities (Direct Access):
 * =========================================
 * 6. ✅ Supabase Client - createBrowserSupabase() (on-demand instantiation)
 *    - Used by: All components needing database/auth access
 * 
 * 7. ✅ Organization/Session Context - Via /api/auth/me endpoint
 *    - Provides: orgId, userId for database operations
 *    - Used by: CommandPalette, HomeClient, LandingChatInput, forms
 * 
 * 8. ✅ Telemetry - trackEvent(), trackDashboardView(), etc. (standalone functions)
 *    - Used by: All components for analytics tracking
 * 
 * Server-Side Auth Guard:
 * =======================
 * This layout runs as a React Server Component (RSC) for server-side authentication.
 * 
 * Benefits:
 * - No hydration mismatches: Server and client render the same authenticated state
 * - Secure session validation: Uses getUser() to verify JWT before rendering
 * - Instant redirect: Unauthenticated users are redirected before any content loads
 * - Zero client-side JavaScript for auth checks
 * 
 * Flow:
 * 1. Extract locale from route params (e.g., "en" or "es")
 * 2. Create server-side Supabase client with cookies
 * 3. Validate session using getUser() (verifies JWT server-side)
 * 4. If no valid session: redirect to localized login with ?next parameter
 * 5. If valid session: render protected children with full provider access
 * 
 * Provider Chain Guarantee:
 * =========================
 * Even though this layout is a Server Component, React preserves the provider chain.
 * All client components in the tree (children, BrikiSidebarLayout, SidebarNav, etc.)
 * have access to all providers from parent layouts. This is guaranteed by React's
 * component composition model - server components are transparent to context providers.
 * 
 * This means:
 * - /agent and /agent/[threadId] have identical capabilities to the landing Agent screen
 * - No "context not found" errors will occur
 * - No duplicate provider warnings (providers are only in parent layouts)
 * - All hooks (useAuth, useTranslations, useUI, etc.) work correctly
 */
export default async function AppLayout({ children, params }: AppLayoutProps) {
  // Extract locale for localized redirects (Next.js 15 async params pattern)
  const { locale } = await params

  // Create server-side Supabase client
  const supabase = await createServerSupabase()

  // Use getUser() for secure authentication check (validates JWT server-side)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // Guard: redirect unauthenticated users to localized login
  if (userError || !user) {
    // Build localized login URL with return path for post-login redirect
    const loginUrl = `/${locale}/login`
    const searchParams = new URLSearchParams({
      next: `/${locale}/dashboard`, // Return to dashboard after successful login
    })
    redirect(`${loginUrl}?${searchParams.toString()}`)
  }

  // TODO: Zero-state detection for first-time users
  // Will display onboarding hints when user has no cases/data
  // Future: Wrap children in <ZeroStateProvider user={user}>{children}</ZeroStateProvider>

  // Feature flag: Workspace shell (default enabled in development)
  // In dev, always show the new workspace shell for optimal DX
  const showWorkspaceShell = env.ENABLE_WORKSPACE_SHELL || env.IS_DEVELOPMENT;

  // Render protected content with sidebar shell - no client-side flashing
  // All providers (Auth, Loading, I18n) are inherited from parent layouts
  if (!showWorkspaceShell) {
    // Fallback to simple layout if feature is explicitly disabled
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <BrikiSidebarLayout sidebar={<AgentSidebar />}>
      {children}
    </BrikiSidebarLayout>
  )
}
