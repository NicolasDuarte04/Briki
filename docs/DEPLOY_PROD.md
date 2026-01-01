## Deploy to Production (Vercel + Supabase)

Practical one-pager to ship Briki to production. Follow these steps in order.

### 1) Provision Database & Auth (Supabase)
Create a new Supabase project for production.

1. **Get Project Credentials:**
   - Go to Project Settings > API
   - Copy `Project URL`, `anon public key`, and `service_role secret`.

2. **Configure Auth URL:**
   - Go to Authentication > URL Configuration
   - Set **Site URL** to `https://your-production-domain.com`
   - Add **Redirect URL**: `https://your-production-domain.com/auth/callback`

3. **Configure Google OAuth:**
   - Go to Authentication > Providers > Google
   - Enable it and add Client ID/Secret (see step 2).

### 2) Create Google OAuth credentials
In Google Cloud Console → APIs & Services → Credentials:

1. Create Credentials → **OAuth client ID** → Application type: **Web application**.
2. **Authorized redirect URIs** (CRITICAL):
   - Add the **Supabase Callback URL** (not your app URL):
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. **Authorized JavaScript origins**:
   - `https://your-production-domain.com`
   - `https://<your-project-ref>.supabase.co`
4. Copy Client ID and Client Secret to Supabase Dashboard.

### 3) Set environment variables in Vercel
Project → Settings → Environment Variables:

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL` = Your Production Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Production Anon Key
- `SUPABASE_SERVICE_ROLE_KEY` = Your Production Service Role Key

**App Configuration:**
- `NEXT_PUBLIC_SITE_URL` = `https://your-production-domain.com`

**Database (Prisma):**
- `DATABASE_URL` = Connection string from Supabase (Transaction Mode / port 6543)
- `DIRECT_URL` = Connection string from Supabase (Session Mode / port 5432)

**Security (Encryption):**
- `APP_ENCRYPTION_KEY` = 32-byte hex key for PII encryption (pgcrypto)

### 4) Run Database Migrations
Run this against the production database:

```bash
# Ensure DATABASE_URL points at production
pnpm prisma db push
```

**Note:** `prisma generate` runs automatically during build on Vercel.

### 5) First-user smoke checklist
1. Open the production URL.
2. Click “Continue with Google” → complete sign-in.
3. You should be redirected to `/dashboard` (or `/onboarding` if new).
4. Verify DB tables:
   - Check `auth.users` in Supabase Table Editor.
   - Check `public.profiles`, `public.organizations` were created.
5. Verify secure routes (`/dashboard`) work correctly.

### Common Issues

**"Redirect URI mismatch" (Google Error)**
- You likely put your App URL in Google Console instead of Supabase Callback URL.
- Fix: Put `https://<project-ref>.supabase.co/auth/v1/callback` in Google Console.

**"AuthApiError: redirect_uri_mismatch" (Supabase Error)**
- You likely forgot to add your App Callback URL in Supabase Dashboard.
- Fix: Add `https://your-domain.com/auth/callback` in Supabase Auth > URL Configuration.

**Database Connection Errors**
- Ensure `DATABASE_URL` is set to the Transaction Pooler (port 6543) for Vercel (serverless environment).
