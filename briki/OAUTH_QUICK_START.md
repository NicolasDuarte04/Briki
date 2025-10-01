# 🚀 OAuth Quick Start - 5 Minutes to Working Login

## What Was Fixed ✅

I've completed all the code changes needed for Google OAuth:

1. ✅ **Locked dev server to port 3000** - Updated `package.json` to force Next.js to always use port 3000
2. ✅ **Fixed NextAuth route** - Set `runtime = "nodejs"` to avoid Edge runtime issues
3. ✅ **Fixed login buttons** - Both desktop and mobile login buttons now call `signIn("google")`
4. ✅ **Auth configuration** - NextAuth is properly configured with Google provider and Prisma adapter

## What You Need to Do 🔧

### Quick Setup (5 minutes)

#### 1. Create `.env.local` in the `briki/` directory:

```bash
# Generate a secure secret first
openssl rand -base64 32
```

Then create `briki/.env.local`:

```bash
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=paste-the-generated-secret-here
NEXTAUTH_SECRET=paste-the-generated-secret-here

GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
AUTH_GOOGLE_ID=your-client-id
AUTH_GOOGLE_SECRET=your-client-secret

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/briki
```

#### 2. Configure Google OAuth Console

**Go to:** https://console.cloud.google.com/apis/credentials

**Add these EXACT URLs:**

| Setting | URL |
|---------|-----|
| Authorized JavaScript origins | `http://localhost:3000` |
| Authorized redirect URIs | `http://localhost:3000/api/auth/callback/google` |

**❌ Remove these if present:**
- `http://localhost:3002/*`
- `http://localhost:5050/*`

**Copy credentials to `.env.local`:**
- Client ID → `GOOGLE_CLIENT_ID` and `AUTH_GOOGLE_ID`
- Client Secret → `GOOGLE_CLIENT_SECRET` and `AUTH_GOOGLE_SECRET`

#### 3. Start PostgreSQL (if not running)

**Option A - Docker (recommended):**
```bash
docker run --name briki-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=briki \
  -p 5432:5432 \
  -d postgres:15
```

**Option B - Homebrew:**
```bash
brew services start postgresql@15
createdb briki
```

#### 4. Setup Database

```bash
cd briki
pnpm prisma db push
```

#### 5. Start the App

```bash
pnpm dev
```

Visit **http://localhost:3000** and click **Login** 🎉

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Missing AUTH_SECRET" warning | Restart dev server after creating `.env.local` |
| Port 3000 already in use | Kill process: `lsof -ti:3000 \| xargs kill -9` |
| 405 errors | Run `pnpm dev:clean` to clear `.next` cache |
| Can't connect to Google | Verify redirect URI is exactly `http://localhost:3000/api/auth/callback/google` |
| Database error | Check PostgreSQL is running: `psql -U postgres -d briki -c '\q'` |

---

## Automated Setup

For a guided setup, run:

```bash
cd briki
./scripts/setup-oauth.sh
```

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Force dev server to port 3000 |
| `src/app/api/auth/[...nextauth]/route.ts` | Set `runtime = "nodejs"` |
| `src/components/BrikiLandingNavbar.tsx` | Added `onClick={() => signIn("google")}` to login buttons |
| `docs/OAUTH_SETUP.md` | Complete setup documentation |
| `scripts/setup-oauth.sh` | Automated setup helper |

---

## Expected Flow

1. Click **Login** → Redirects to Google
2. Choose Google account → Redirects to `http://localhost:3000/api/auth/callback/google`
3. Callback processes → Redirects to app
4. ✅ You're logged in! Avatar shows in navbar

---

## Next Steps After Login Works

- [ ] Test new user onboarding flow
- [ ] Test returning user flow  
- [ ] Verify logout works
- [ ] Test session persistence

See `docs/OAUTH_SETUP.md` for detailed documentation.

