import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createServerSupabase()
    
    try {
      // Exchange the code for a session
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        throw sessionError
      }

      if (!sessionData.user) {
        throw new Error('No user data returned from session exchange')
      }

      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', sessionData.user.id)
        .single()

      if (profileError) {
        // Profile doesn't exist, create it
        if (profileError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: sessionData.user.id,
              email: sessionData.user.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (insertError) {
            console.error('Failed to create profile:', insertError)
            // Continue anyway - profile creation might be handled by a trigger
          }
        } else {
          // Other profile fetch errors
          console.error('Profile fetch error:', profileError)
          // Continue to default redirect logic
        }
      }

      // Redirect to profile
      return NextResponse.redirect(new URL('/profile', requestUrl.origin))

    } catch (error) {
      console.error('Auth callback error:', error)
      
      // Return error page with link back to login
      return new NextResponse(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Error - Briki</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f9fafb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .error-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      max-width: 400px;
      padding: 32px;
      text-align: center;
    }
    h1 {
      color: #ef4444;
      font-size: 24px;
      margin: 0 0 16px 0;
    }
    p {
      color: #6b7280;
      line-height: 1.5;
      margin: 0 0 24px 0;
    }
    a {
      background-color: #3b82f6;
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 6px;
      display: inline-block;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    a:hover {
      background-color: #2563eb;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>Authentication Error</h1>
    <p>We couldn't complete your sign-in. This might be because the link has expired or was already used.</p>
    <a href="/login">Back to Login</a>
  </div>
</body>
</html>`,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/html',
          },
        }
      )
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
