import { createBrowserClient } from '@supabase/ssr'

// --- TEMPORARY FIX ---
// Forcibly override the Supabase credentials to bypass environment variable issues.
const SUPABASE_URL = "https://vkzukorwsllzhpnzdmlo.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrenVrb3J3c2xsemhwbnpkbWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNDY0MjEsImV4cCI6MjA3NDgyMjQyMX0.k7nTHMvqxsdb0r1-VOr912FHq-pHAXKzTkMtdR36jvw"


let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createBrowserSupabase() {
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }

  return browserClient
}
