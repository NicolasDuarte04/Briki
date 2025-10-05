import { createServerClient, type SupabaseClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// --- TEMPORARY FIX ---
// Forcibly override the Supabase credentials to bypass environment variable issues.
const SUPABASE_URL = "https://vkzukorwsllzhpnzdmlo.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrenVrb3J3c2xsemhwbnpkbWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNDY0MjEsImV4cCI6MjA3NDgyMjQyMX0.k7nTHMvqxsdb0r1-VOr912FHq-pHAXKzTkMtdR36jvw"


export async function createServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
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
