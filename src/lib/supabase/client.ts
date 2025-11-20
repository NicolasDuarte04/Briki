import { createBrowserClient } from '@supabase/ssr'

// Retrieve Supabase credentials from environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Development-time assertions to ensure environment variables are configured
if (process.env.NODE_ENV === 'development') {
  if (!SUPABASE_URL) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. Please configure it in .env.local'
    )
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. Please configure it in .env.local'
    )
  }
}

// Runtime validation for production
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase environment variables are not configured')
}

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createBrowserSupabase() {
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  }

  return browserClient
}
