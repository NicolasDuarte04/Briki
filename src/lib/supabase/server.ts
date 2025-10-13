import { createServerClient, createClient, type SupabaseClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

export async function createServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      auth: {
        // Silently handle auth token not found errors
        debug: false,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        // Suppress auth-related console warnings
        headers: {
          'X-Client-Info': 'supabase-ssr',
        },
      },
      db: {
        schema: 'public',
      },
    }
  )
}

/**
 * Creates a Supabase client with Service Role key for server-side operations.
 * ⚠️ WARNING: Only use in API routes or server components. Never expose to client.
 * This client bypasses Row Level Security (RLS).
 */
export function createServiceRoleClient(): SupabaseClient {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
    }
  )
}
