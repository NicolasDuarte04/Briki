import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/onboarding'

  if (code) {
    const supabase = await createServerSupabase()
    
    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()
        
        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              name: user.email?.split('@')[0],
              onboarding_completed: false
            })
          
          if (insertError) {
            console.error('Profile creation error:', insertError)
          }
          
          // Redirect to onboarding
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
        }
        
        // Redirect based on onboarding status
        if (profile?.onboarding_completed) {
          return NextResponse.redirect(new URL('/app', requestUrl.origin))
        } else {
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
        }
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/auth/error', requestUrl.origin))
}
