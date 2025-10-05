import { createBrowserClient } from '@supabase/ssr'

function getEnvVar(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error('Missing Supabase browser client environment variables.')
  }
  return value
}

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function supabaseBrowser() {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  return browserClient
}
