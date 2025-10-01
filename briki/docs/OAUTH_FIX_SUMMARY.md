# Google OAuth Login Fix - Complete Summary

**Date:** October 1, 2025  
**Status:** ✅ Code changes complete - Configuration required

---

## Problem Analysis

### Symptoms
- ❌ Safari shows "can't connect to server" after Google OAuth callback
- ❌ Console: `405 /api/auth/session`
- ❌ Console: `ClientFetchError: The string did not match the expected pattern`
- ❌ Terminal: Repeated "Missing AUTH_SECRET environment variable" warnings
- ❌ Dev server started on port 3002 (inconsistent with config)
- ❌ Google OAuth configured for port 5050 and production URLs (not localhost:3000)

### Root Causes
1. **Port Mismatch** - Server on 3002, Google OAuth expecting different ports
2. **Missing Environment Variables** - No `.env.local` file with required secrets
3. **Login Button Not Wired** - Buttons had no `onClick` handler to trigger auth
4. **Runtime Configuration** - NextAuth route not explicitly set to Node.js runtime

---

## Solutions Implemented ✅

### 1. Port Locking (Fixed)
**File:** `package.json`

```json
"scripts": {
  "dev": "next dev -p 3000",        // ← Force port 3000
  "dev:clean": "rm -rf .next && next dev -p 3000"
}
```

**Result:** Dev server will ALWAYS start on `http://localhost:3000`

---

### 2. Runtime Configuration (Fixed)
**File:** `src/app/api/auth/[...nextauth]/route.ts`

```typescript
export { GET, POST } from "@/../auth";

// Force Node.js runtime (not Edge) for NextAuth compatibility
export const runtime = "nodejs";
```

**Result:** Prevents Edge runtime issues, ensures proper session handling

---

### 3. Login Button Integration (Fixed)
**File:** `src/components/BrikiLandingNavbar.tsx`

**Changes:**
- ✅ Added `import { signIn } from "next-auth/react"`
- ✅ Added `onClick={() => signIn("google")}` to desktop login button
- ✅ Added `onClick={() => signIn("google")}` to mobile login button

**Result:** Clicking Login now triggers Google OAuth flow

---

### 4. Authentication Configuration (Already Correct)
**File:** `auth.ts`

The NextAuth configuration was already properly set up:
- ✅ Google provider configured
- ✅ Prisma adapter for database sessions
- ✅ JWT strategy for middleware compatibility
- ✅ Callbacks for user profile and onboarding status
- ✅ Error handling for missing credentials

---

## Configuration Requirements ⚠️

### You Must Complete These Steps:

#### Step 1: Create `.env.local`

Create `briki/.env.local` with:

```bash
# Generate secret: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=<paste-generated-secret>
NEXTAUTH_SECRET=<paste-generated-secret>

# From Google Cloud Console
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
AUTH_GOOGLE_ID=<your-client-id>
AUTH_GOOGLE_SECRET=<your-client-secret>

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/briki
```

#### Step 2: Update Google OAuth Console

**URL:** https://console.cloud.google.com/apis/credentials

**Configure Web Application Client:**

| Field | Exact Value |
|-------|-------------|
| Authorized JavaScript origins | `http://localhost:3000` |
| Authorized redirect URIs | `http://localhost:3000/api/auth/callback/google` |

**Remove:**
- All `localhost:3002` entries
- All `localhost:5050` entries
- Keep only `localhost:3000`

#### Step 3: Database Setup

```bash
# Start PostgreSQL (Docker)
docker run --name briki-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=briki \
  -p 5432:5432 \
  -d postgres:15

# Setup database schema
cd briki
pnpm prisma db push
```

---

## Testing the Fix

### Pre-Flight Checks

Before starting the server:

```bash
# 1. Verify .env.local exists
ls -la briki/.env.local

# 2. Check Google OAuth settings
# Visit: https://console.cloud.google.com/apis/credentials
# Verify: localhost:3000 in both fields

# 3. Verify PostgreSQL is running
psql postgresql://postgres:postgres@localhost:5432/briki -c '\q'

# 4. Ensure port 3000 is free
lsof -ti:3000  # Should return nothing
```

### Start the Application

```bash
cd briki
pnpm dev
```

**Expected output:**
```
▲ Next.js 15.5.3
- Local:        http://localhost:3000
- Ready in X.Xs
```

**No warnings about:**
- ❌ Missing AUTH_SECRET
- ❌ Port in use

### Execute Login Flow

1. **Navigate:** http://localhost:3000
2. **Click:** Login button (navbar)
3. **Observe:** Redirect to `accounts.google.com`
4. **Select:** Google account
5. **Observe:** Redirect to `http://localhost:3000/api/auth/callback/google`
6. **Observe:** Redirect to application root
7. **Verify:** User avatar appears in navbar

### Browser Console Checks

**Open DevTools Console** - Should see:
- ✅ No 405 errors on `/api/auth/session`
- ✅ No "string did not match expected pattern" errors
- ✅ No CORS errors
- ✅ Session API returns 200 status

### Server Console Checks

**Terminal running `pnpm dev`** - Should see:
- ✅ No "Missing AUTH_SECRET" warnings
- ✅ No database connection errors
- ✅ Successful OAuth callback logs

---

## Architecture Overview

```
User clicks Login
    ↓
signIn("google") called
    ↓
Redirect to Google OAuth
    ↓
User authenticates with Google
    ↓
Google redirects to: http://localhost:3000/api/auth/callback/google
    ↓
NextAuth route handler (runtime: nodejs)
    ↓
Verify OAuth callback
    ↓
Create/update user in Prisma DB
    ↓
Create JWT session token
    ↓
Set session cookie
    ↓
Redirect to application root
    ↓
Middleware checks session
    ↓
SessionProvider provides session to React
    ↓
User is authenticated ✅
```

---

## File Inventory

### Modified Files
| File | Changes | Status |
|------|---------|--------|
| `package.json` | Force port 3000 | ✅ Complete |
| `src/app/api/auth/[...nextauth]/route.ts` | Add nodejs runtime | ✅ Complete |
| `src/components/BrikiLandingNavbar.tsx` | Wire login buttons | ✅ Complete |

### Created Files
| File | Purpose |
|------|---------|
| `OAUTH_QUICK_START.md` | Quick reference guide |
| `docs/OAUTH_SETUP.md` | Detailed setup documentation |
| `docs/OAUTH_FIX_SUMMARY.md` | This file - complete analysis |
| `scripts/setup-oauth.sh` | Automated setup helper |

### Existing Files (No Changes Needed)
| File | Status |
|------|--------|
| `auth.ts` | ✅ Already correctly configured |
| `src/app/login/page.tsx` | ✅ Already has signIn wired |
| `src/middleware.ts` | ✅ Already exports auth |
| `src/components/AuthProvider.tsx` | ✅ Already wraps SessionProvider |
| `prisma/schema.prisma` | ✅ Already has NextAuth tables |

---

## Security Checklist

- [x] `.env.local` is in `.gitignore` (verified: `.env*` pattern exists)
- [ ] `AUTH_SECRET` is strong random string (user must set)
- [ ] Google OAuth credentials are from correct project (user must verify)
- [ ] Production OAuth client is separate from development (future)
- [ ] Database connection uses SSL in production (future)

---

## Troubleshooting Guide

### Issue: "Missing AUTH_SECRET" in console

**Cause:** `.env.local` not found or `AUTH_SECRET` not set

**Fix:**
```bash
# Generate secret
openssl rand -base64 32

# Add to .env.local
echo "AUTH_SECRET=<generated-secret>" >> briki/.env.local
echo "NEXTAUTH_SECRET=<generated-secret>" >> briki/.env.local

# Restart dev server
```

---

### Issue: 405 on /api/auth/session

**Cause:** Edge runtime or route handler misconfiguration

**Fix:**
```bash
# Already fixed in code, but if persists:
cd briki
rm -rf .next
pnpm dev:clean
```

---

### Issue: "Can't connect to server" after Google callback

**Cause:** Redirect URI mismatch in Google Console

**Fix:**
1. Go to Google Cloud Console → Credentials
2. Verify redirect URI is EXACTLY: `http://localhost:3000/api/auth/callback/google`
3. No trailing slash, no query params
4. Save and wait 5 minutes for propagation

---

### Issue: Port 3000 already in use

**Cause:** Another process using port 3000

**Fix:**
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Restart
pnpm dev
```

---

### Issue: Database connection error

**Cause:** PostgreSQL not running or wrong credentials

**Fix:**
```bash
# Check if PostgreSQL is running
docker ps | grep briki-postgres

# If not, start it
docker run --name briki-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=briki \
  -p 5432:5432 \
  -d postgres:15

# Verify connection
psql postgresql://postgres:postgres@localhost:5432/briki -c '\q'

# Push schema
pnpm prisma db push
```

---

## Verification Checklist

Before considering OAuth complete:

**Environment Setup:**
- [ ] `.env.local` exists with all required variables
- [ ] `AUTH_SECRET` is set to strong random value (32+ chars)
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- [ ] `DATABASE_URL` points to running PostgreSQL instance

**Google Console:**
- [ ] OAuth client ID created for Web Application
- [ ] JavaScript origins: `http://localhost:3000`
- [ ] Redirect URIs: `http://localhost:3000/api/auth/callback/google`
- [ ] No stray `3002` or `5050` entries

**Database:**
- [ ] PostgreSQL running on port 5432
- [ ] Database `briki` exists
- [ ] `pnpm prisma db push` completed successfully
- [ ] No connection errors

**Application:**
- [ ] Dev server starts on `http://localhost:3000`
- [ ] No "Missing AUTH_SECRET" warnings in terminal
- [ ] Login button exists and is clickable
- [ ] Clicking Login redirects to Google
- [ ] After Google auth, redirected back to app
- [ ] User avatar appears after login
- [ ] No 405 or other errors in browser console

**Session:**
- [ ] `useSession()` hook returns `authenticated` status
- [ ] Session persists across page reloads
- [ ] Logout works correctly
- [ ] New users trigger onboarding flow (if applicable)

---

## Performance & Best Practices

### Current Implementation ✅

- **JWT Sessions:** Fast, stateless, middleware-compatible
- **Prisma Adapter:** User data persisted in database
- **Database Connection Pooling:** Global Prisma client prevents connection leaks
- **Error Handling:** Graceful degradation if env vars missing (dev mode)
- **Security:** Secrets in `.env.local`, not committed to git

### Production Recommendations

When deploying to production:

1. **Separate OAuth Client**
   - Create new OAuth client for production domain
   - Different `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

2. **Strong Secrets**
   - Generate new `AUTH_SECRET` for production
   - Use environment variable manager (Vercel, Railway, etc.)

3. **Database**
   - Use managed PostgreSQL (Supabase, Neon, etc.)
   - Enable SSL: `DATABASE_URL=postgresql://...?sslmode=require`

4. **HTTPS Required**
   - Google OAuth requires HTTPS in production
   - `NEXTAUTH_URL=https://yourdomain.com`

5. **Session Management**
   - Configure session `maxAge` appropriately
   - Consider refresh token rotation
   - Implement proper logout flow

---

## Next Steps

### Immediate (Blocking)
1. ✅ Create `.env.local` with all required variables
2. ✅ Configure Google OAuth Console with correct URLs
3. ✅ Start PostgreSQL and run migrations
4. ✅ Test login flow end-to-end

### Short Term
- [ ] Test onboarding flow for new users
- [ ] Test returning user flow
- [ ] Verify middleware redirects work
- [ ] Test logout functionality
- [ ] Test session persistence

### Future Enhancements
- [ ] Add GitHub OAuth provider (optional)
- [ ] Implement email magic links (optional)
- [ ] Add two-factor authentication (optional)
- [ ] Session activity monitoring (optional)
- [ ] Remember device functionality (optional)

---

## Support Resources

- **NextAuth v5 Docs:** https://authjs.dev/
- **Google OAuth Setup:** https://console.cloud.google.com/apis/credentials
- **Prisma Docs:** https://www.prisma.io/docs
- **Quick Start:** See `OAUTH_QUICK_START.md`
- **Detailed Setup:** See `docs/OAUTH_SETUP.md`
- **Automated Setup:** Run `./scripts/setup-oauth.sh`

---

**Last Updated:** October 1, 2025  
**Version:** 1.0  
**Author:** AI Assistant  
**Status:** Ready for user configuration

