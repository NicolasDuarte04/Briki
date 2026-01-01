# Google OAuth Setup Guide (Supabase Auth)

This guide helps you configure Google OAuth using Supabase Auth for local development and production.

## Quick Summary

✅ **Architecture:** Using Supabase Auth (not NextAuth)
✅ **Callback Route:** `/auth/callback` (handles profile/org creation)
✅ **Client Implementation:** Client-side via `createBrowserSupabase()`

## Step 1: Configure Supabase Dashboard

1. **Go to Supabase Dashboard** > **Authentication** > **Providers** > **Google**
2. **Enable Google Provider**
3. **Configure Credentials:**
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
4. **Save**

## Step 2: Configure Redirect URLs

1. **Go to Supabase Dashboard** > **Authentication** > **URL Configuration**
2. **Site URL:**
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`
3. **Redirect URLs:**
   Add the following exact URLs:
   - `http://localhost:3000/auth/callback` (Development)
   - `https://your-domain.com/auth/callback` (Production)

> ⚠️ **IMPORTANT**: Do NOT use `/api/auth/callback` or `/api/auth/callback/google`. These are legacy NextAuth routes.

## Step 3: Configure Environment Variables

Update your `.env.local` file. Remove any legacy NextAuth variables (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_GOOGLE_ID`, etc.).

Required variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site URL (Used for constructing callback URLs)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Note:** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are NOT required in `.env.local` if you configured them directly in Supabase Dashboard. If you prefer keeping them in code/env (e.g. for CI/CD), Supabase handles that server-side, but typically for OAuth with Supabase, the credentials live in the Supabase Dashboard.

## Step 4: Verify Database Setup

The OAuth callback (`src/app/auth/callback/route.ts`) automatically handles:
1. Creating the `User` in `auth.users` (Supabase)
2. Creating the `Profile` in `public.profiles`
3. Creating a default **Organization** (`public.organizations`)
4. Creating the **Membership** (`public.org_members`) as `owner`

Ensure your database migrations are applied:

```bash
pnpm prisma db push
```

## Step 5: Test the Flow

1. Open http://localhost:3000/login
2. Click "Continue with Google"
3. You should be redirected to Google
4. After login, redirected back to `/auth/callback`
5. Finally redirected to `/dashboard` (or `/onboarding` if incomplete)

## Troubleshooting

### "Redirect URI mismatch" error from Google
- Check Google Cloud Console > APIs & Services > Credentials
- Ensure "Authorized redirect URIs" includes exactly what Supabase tells you (usually `https://<project-ref>.supabase.co/auth/v1/callback`)
- **Note:** Google talks to Supabase, Supabase talks to your app. So Google needs the Supabase Callback URL, and Supabase needs your App Callback URL (`http://localhost:3000/auth/callback`).

### "AuthApiError: redirect_uri_mismatch" from Supabase
- Check Supabase Dashboard > Authentication > URL Configuration
- Ensure `http://localhost:3000/auth/callback` is listed in **Redirect URLs**

### Login loop or stuck at loader
- Check browser console for errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check server logs for database transaction errors in `/auth/callback`
