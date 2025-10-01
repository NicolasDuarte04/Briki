## Deploy to Vercel (Postgres + Google OAuth)

Practical one-pager to ship. Follow these steps in order.

### 1) Provision Postgres
- **Vercel Postgres (recommended):** Add the Vercel Postgres integration to your project.
- Copy the connection strings from the integration:
  - **POSTGRES_URL_NON_POOLING** (direct) — safest for Prisma migrations.
  - (Optional) **POSTGRES_URL** (pooled) — better for runtime at scale.
- External Postgres works too; just grab a standard `postgres://` URL.

### 2) Create Google OAuth credentials
In Google Cloud Console → APIs & Services → Credentials:
- Create Credentials → **OAuth client ID** → Application type: **Web application**.
- Add Authorized redirect URIs (exact, no wildcards):
  - `http://localhost:3000/api/auth/callback/google`
  - `https://YOUR_PROD_DOMAIN/api/auth/callback/google`
  - (Optional, if you want login on previews) `https://YOUR_PROJECT.vercel.app/api/auth/callback/google` and any branch preview URLs you need
- Add Authorized JavaScript origins:
  - `http://localhost:3000`
  - `https://YOUR_PROD_DOMAIN`
  - (Optional) `https://YOUR_PROJECT.vercel.app`
- Save the Client ID and Client Secret.

### 3) Set environment variables in Vercel
Project → Settings → Environment Variables:
- **AUTH_GOOGLE_ID** = Google Client ID
- **AUTH_GOOGLE_SECRET** = Google Client Secret
- **NEXTAUTH_SECRET** = a strong secret
  - Generate: `openssl rand -base64 32` (or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- **NEXTAUTH_URL** = `https://YOUR_PROD_DOMAIN` (Production only)
- **DATABASE_URL** = your Postgres URL
  - Simple (works now): set to **POSTGRES_URL_NON_POOLING**
  - At scale (optional): set **DATABASE_URL=POSTGRES_URL** and add **DIRECT_URL=POSTGRES_URL_NON_POOLING**, then update `prisma/schema.prisma` datasource to include `directUrl = env("DIRECT_URL")`

Tip: Mirror these vars for Preview/Development as needed. For Preview logins to work, you must add each preview callback URL to Google.

### 4) Run Prisma generate + migrations
Run these against the production database once after provisioning (and anytime the schema changes):

```bash
# Ensure DATABASE_URL points at the production DB
pnpm prisma:generate
pnpm prisma migrate deploy
```

Notes:
- `prisma generate` also runs on install via the repo's postinstall script.
- If you prefer, use `vercel env pull .env.production.local` and run the above commands with that file active.

### 5) First-user smoke checklist
- Open the production URL.
- Click “Continue with Google” → complete sign-in.
- You should be redirected back authenticated (no errors in Vercel logs).
- Verify DB tables exist and a user row was created (Vercel Data view or any SQL client):
  - Example: `SELECT id, email FROM "User" ORDER BY createdAt DESC LIMIT 5;`
- Visit a protected route (e.g., `/workspace`) and confirm access/redirects work as expected.
- Sign out and sign back in.

Common issues:
- **redirect_uri_mismatch**: Add the exact preview/prod callback URL(s) in Google.
- **Missing Google credentials**: Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in the correct environment.
- **JWT/secret errors**: Ensure `NEXTAUTH_SECRET` is set in Vercel and not empty.
- **DB errors**: Confirm `DATABASE_URL` points to the correct Postgres and that migrations ran.


