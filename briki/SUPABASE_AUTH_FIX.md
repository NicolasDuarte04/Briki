# Supabase Authentication Fix Guide

## Problem Summary

The authentication is failing because:
1. **IPv6 Issue**: The direct host (`db.vkzukorwsllzhpnzdmlo.supabase.co`) only resolves to IPv6, causing connection failures
2. **Missing Project Ref**: Runtime database URLs don't include the project reference in the username
3. **Tables Not Created**: The NextAuth tables (Account, User, Session, etc.) haven't been created in the database

## Solution

Use the **pooled connection** endpoint with the project reference embedded in the username.

### Quick Fix (Recommended)

Run the setup script I've created:

```bash
cd briki
./setup-supabase-env.sh
```

This script will:
1. Configure your `.env.local` with the correct pooled URLs
2. Test the database connection
3. Guide you through the remaining setup steps

### Manual Fix

If you prefer to set up manually:

#### 1. Create/Update `.env.local`

```bash
# Supabase Database URLs - Using pooled connection with project ref
DATABASE_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="YOUR_32_CHAR_SECRET_HERE"
AUTH_SECRET="YOUR_32_CHAR_SECRET_HERE"

# Google OAuth
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
AUTH_GOOGLE_ID="YOUR_GOOGLE_CLIENT_ID"
AUTH_GOOGLE_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
```

**Important**: Replace `YOUR_PASSWORD` with your actual Supabase database password.

#### 2. Generate AUTH_SECRET

```bash
openssl rand -base64 32
```

#### 3. Create Database Tables

Option A - Using Prisma (Recommended):
```bash
cd briki
pnpm prisma generate
pnpm prisma db push
```

Option B - Using SQL directly:
```bash
cd briki
PGPASSWORD=YOUR_PASSWORD psql -h aws-1-us-east-2.pooler.supabase.com -p 6543 -U postgres.vkzukorwsllzhpnzdmlo -d postgres -f prisma_init.sql
```

#### 4. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create or update your OAuth 2.0 Client ID
3. Set these exact values:
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`

### Testing

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Open http://localhost:3000

3. Click the Login button

4. You should be redirected to Google, then back to your app

5. Check that your user avatar appears in the navbar

## Troubleshooting

### "The table `public.Account` does not exist"

This means the tables haven't been created. Run:
```bash
pnpm prisma db push
```

### Connection refused or timeout

Make sure you're using the pooled endpoint:
- ✅ `aws-1-us-east-2.pooler.supabase.com`
- ❌ `db.vkzukorwsllzhpnzdmlo.supabase.co`

### "Tenant or user not found"

Include the project ref in the username:
- ✅ `postgres.vkzukorwsllzhpnzdmlo`
- ❌ `postgres`

### Google OAuth redirect fails

Ensure your Google OAuth console has exactly:
- Origins: `http://localhost:3000`
- Redirect URI: `http://localhost:3000/api/auth/callback/google`

## Key Points

1. **Always use the pooled connection** for runtime connections
2. **Include project ref** in the username: `postgres.vkzukorwsllzhpnzdmlo`
3. **Use port 6543** for pooled connections (DATABASE_URL)
4. **Use port 5432** for direct connections (DIRECT_URL)

## Connection String Breakdown

```
postgresql://postgres.vkzukorwsllzhpnzdmlo:PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
             └─────────────┬──────────────┘    │     └────────────────┬───────────────────┘  │       │         │
                    username with                │                   pooled host               │       │         │
                    project ref                password                                      port   database  pgbouncer
```

## Next Steps

After fixing the connection:
1. Test the login flow end-to-end
2. Verify session persistence
3. Test logout functionality
4. Check that new users are created in the database

## Resources

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling)
- [NextAuth Documentation](https://authjs.dev/)
- [Prisma with Supabase](https://www.prisma.io/docs/guides/database/supabase)
