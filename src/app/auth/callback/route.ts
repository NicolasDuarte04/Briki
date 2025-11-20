import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    // No code provided, return error HTML with link to login
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: system-ui; padding: 2rem; text-align: center; }
            a { color: #0066cc; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>Authentication Error</h1>
          <p>No authentication code was provided.</p>
          <p><a href="/login">Return to Login</a></p>
        </body>
      </html>`,
      {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }

  const supabase = await createServerSupabase()
  
  // Exchange code for session
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  
  if (error) {
    console.error('Auth exchange error:', error)
    // Return error HTML with link to login
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: system-ui; padding: 2rem; text-align: center; }
            a { color: #0066cc; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>Authentication Error</h1>
          <p>Failed to authenticate. Please try again.</p>
          <p><a href="/login">Return to Login</a></p>
        </body>
      </html>`,
      {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }

  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    // Should not happen if exchange was successful
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: system-ui; padding: 2rem; text-align: center; }
            a { color: #0066cc; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>Authentication Error</h1>
          <p>Unable to retrieve user information.</p>
          <p><a href="/login">Return to Login</a></p>
        </body>
      </html>`,
      {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }

  // Ensure profile exists using Prisma upsert
  const profile = await prisma.profile.upsert({
    where: { id: user.id },
    update: {}, // No updates needed if profile exists
    create: {
      id: user.id,
      name: null, // Start with null name as per requirements
      locale: 'en'
    }
  })

  // Check onboarding status and redirect accordingly
  if (!profile.onboardingCompleted) {
    redirect('/onboarding')
  } else {
    redirect('/profile') // Or your app home route
  }
}
