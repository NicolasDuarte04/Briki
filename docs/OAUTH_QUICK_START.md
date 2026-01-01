# 🚀 OAuth Quick Start - Supabase Auth

## What Was Fixed ✅

The authentication system has been migrated from NextAuth to **Supabase Auth**.

1. ✅ **Client-side OAuth**: Login button now directly triggers Supabase Auth.
2. ✅ **Unified Callback**: Using `/auth/callback` to handle user creation, profile setup, and organization provisioning.
3. ✅ **Full Parity**: OAuth signup now creates Organization and Membership just like email signup.

## Quick Setup (5 minutes)

### 1. Update `.env.local`

Remove legacy NextAuth variables. Your `.env.local` should look like this:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/briki
```

### 2. Configure Supabase Dashboard

**Go to:** Authentication > URL Configuration

**Add these EXACT URLs:**

| Setting | URL |
|---------|-----|
| Site URL | `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/auth/callback` |

**Go to:** Authentication > Providers > Google
- Enable Google
- Enter Client ID & Secret from Google Cloud Console

### 3. Verify Google Cloud Console

**Go to:** https://console.cloud.google.com/apis/credentials

Ensure your OAuth 2.0 Client has the **Supabase Callback URL** in "Authorized redirect URIs".
* It looks like: `https://<your-project-ref>.supabase.co/auth/v1/callback`

### 4. Start the App

```bash
pnpm dev
```

Visit **http://localhost:3000/login** and click **Continue with Google** 🎉

---

## Expected Flow

1. Click **Continue with Google** → Redirects to Google
2. Choose Google account → Redirects to Supabase → Redirects to `http://localhost:3000/auth/callback`
3. Callback Route (`src/app/auth/callback/route.ts`):
   - Exchanges code for session
   - Creates Profile
   - Creates Organization & Membership (if new user)
4. Redirects to `/dashboard`

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Redirect URI mismatch" | Check Supabase Dashboard URL Configuration. Must include `/auth/callback`. |
| "Auth session missing" | Ensure `NEXT_PUBLIC_SITE_URL` is set correctly. |
| Database error | Check server logs. Ensure migrations are applied (`pnpm prisma db push`). |
