# Google OAuth Setup Guide

This guide will help you configure Google OAuth for local development.

## Quick Fix Summary

✅ **Completed:**
- Force Next.js dev server to run on port 3000
- Updated NextAuth route handler to use Node.js runtime
- Fixed login buttons to call `signIn('google')`
- Created setup documentation

⚠️ **You must complete:**
1. Create `.env.local` file with correct values
2. Configure Google OAuth Console
3. Set up PostgreSQL database
4. Run database migrations

---

## Step 1: Create `.env.local` File

Create a file named `.env.local` in the `briki/` directory with the following content:

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=your-super-secret-key-change-this-in-production-min-32-chars-long
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production-min-32-chars-long

# Google OAuth Credentials (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
AUTH_GOOGLE_ID=your-google-client-id-here
AUTH_GOOGLE_SECRET=your-google-client-secret-here

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/briki
```

### Generate a Secure AUTH_SECRET

Run this command to generate a strong secret:

```bash
openssl rand -base64 32
```

Copy the output and replace both `AUTH_SECRET` and `NEXTAUTH_SECRET` values with it.

---

## Step 2: Configure Google OAuth Console

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Select your project or create a new one

2. **Create OAuth 2.0 Client ID:**
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Briki Local Development"

3. **Configure URLs:**
   
   **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   ```

   **Authorized redirect URIs:**
   ```
   http://localhost:3000/api/auth/callback/google
   ```

4. **Save and Copy Credentials:**
   - Click "Create"
   - Copy the **Client ID** and **Client Secret**
   - Paste them into your `.env.local` file:
     - `GOOGLE_CLIENT_ID` = Client ID
     - `GOOGLE_CLIENT_SECRET` = Client Secret
     - `AUTH_GOOGLE_ID` = Client ID (same value)
     - `AUTH_GOOGLE_SECRET` = Client Secret (same value)

5. **Remove Old Redirect URIs:**
   - Delete any entries for `localhost:5050` or `localhost:3002`
   - Only keep `localhost:3000`

---

## Step 3: Set Up PostgreSQL Database

### Option A: Using Docker (Recommended)

```bash
docker run --name briki-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=briki \
  -p 5432:5432 \
  -d postgres:15
```

### Option B: Install PostgreSQL Locally

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb briki
```

### Verify Connection

Your `DATABASE_URL` should be:
```
postgresql://postgres:postgres@localhost:5432/briki
```

Adjust username/password if different.

---

## Step 4: Run Database Migrations

```bash
cd briki

# Generate Prisma client
pnpm prisma generate

# Push schema to database
pnpm prisma db push

# (Optional) Open Prisma Studio to verify
pnpm prisma studio
```

---

## Step 5: Start the Development Server

```bash
cd briki
pnpm dev
```

The server will now **always start on http://localhost:3000**.

---

## Step 6: Test the Login Flow

1. Open http://localhost:3000 in your browser
2. Click the "Login" button in the navbar
3. You should be redirected to Google's login page
4. Choose your Google account
5. You should be redirected back to http://localhost:3000/api/auth/callback/google
6. Then automatically redirected to the app as an authenticated user

### Expected Behavior:
- ✅ No "Missing AUTH_SECRET" warnings in terminal
- ✅ No 405 errors in browser console
- ✅ No "string did not match expected pattern" errors
- ✅ User avatar/menu appears after login
- ✅ `useSession()` returns `{ status: "authenticated" }`

---

## Troubleshooting

### "Missing AUTH_SECRET" Warning
- Ensure `.env.local` exists with `AUTH_SECRET` set
- Restart the dev server after creating `.env.local`

### 405 Method Not Allowed
- Check that `runtime = "nodejs"` is exported in `route.ts` (already fixed)
- Clear `.next` folder: `pnpm dev:clean`

### "Safari can't connect to the server"
- Verify Google OAuth redirect URI is exactly: `http://localhost:3000/api/auth/callback/google`
- Check that `NEXTAUTH_URL=http://localhost:3000` in `.env.local`
- Ensure no other service is using port 3000

### Database Connection Failed
- Verify PostgreSQL is running: `psql -U postgres -d briki`
- Check `DATABASE_URL` format matches your setup
- Run `pnpm prisma db push` to create tables

### Still Getting Redirected to Port 3002
- Kill any process on port 3000: `lsof -ti:3000 | xargs kill -9`
- Restart dev server: `pnpm dev`

---

## Security Notes

⚠️ **Never commit `.env.local` to git** - it's already in `.gitignore`

⚠️ **For production:**
- Use a different OAuth client (not the localhost one)
- Set production URLs in Google Console
- Use a strong, unique `AUTH_SECRET`
- Use managed database with SSL

---

## Verification Checklist

Before considering this complete, verify:

- [ ] `.env.local` exists with all required variables
- [ ] `AUTH_SECRET` is a strong random string (32+ chars)
- [ ] Google OAuth client configured with `localhost:3000`
- [ ] PostgreSQL database running and accessible
- [ ] `pnpm prisma db push` completed successfully
- [ ] Dev server starts on http://localhost:3000
- [ ] Clicking Login redirects to Google
- [ ] After Google auth, redirected back to app
- [ ] No console errors or warnings
- [ ] User session is authenticated

---

## Next Steps After Login Works

Once OAuth is working:
1. Test onboarding flow for new users
2. Test returning user flow
3. Verify middleware redirects work correctly
4. Test logout functionality
5. Test session persistence across page reloads

