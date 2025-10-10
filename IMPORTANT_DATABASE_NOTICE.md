# ⚠️ IMPORTANT: Database Migration Notice

## Current Situation

Your `.env.local` is pointing to a **remote Neon database** that contains **existing production data**:

```
Datasource: PostgreSQL database "neondb" at "ep-small-night-a4dtn63i.us-east-1.aws.neon.tech"
```

## Problem

The current Prisma schema in this repository is for **NextAuth** (Google OAuth), but your database contains tables from a **previous application**:
- `blog_posts`, `blog_categories`, `blog_tags`
- `insurance_plans`, `plans_v2`, etc.
- `users`, `sessions` (different schema than NextAuth)
- `conversation_logs`, `context_snapshots`

Running `prisma db push` would **DELETE ALL THIS DATA** to create the new NextAuth tables.

## ⚠️ DO NOT RUN: `prisma db push --accept-data-loss`

This would destroy your existing data!

## Solutions

### Option 1: Use a Local Database for Development (Recommended)

Create a **separate local database** for OAuth development:

```bash
# 1. Start local PostgreSQL with Docker
docker run --name briki-oauth-dev \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=briki_dev \
  -p 5433:5432 \
  -d postgres:15

# 2. Update .env.local to use local database
# Change this line:
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/briki_dev

# 3. Then run migrations safely
pnpm prisma db push
```

### Option 2: Create a Migration (Advanced)

If you want to keep the existing data and add NextAuth tables:

```bash
# 1. Create a migration instead of using db push
pnpm prisma migrate dev --name add_nextauth_tables

# This will:
# - Keep existing tables
# - Add new NextAuth tables (User, Account, Session, etc.)
# - Handle any conflicts
```

**Note:** You may have table name conflicts (e.g., `users` vs `User`, `sessions` vs `Session`)

### Option 3: Use Different Database for OAuth

Create a completely separate database on Neon:

```bash
# 1. Go to Neon dashboard
# 2. Create new database called "briki_oauth"
# 3. Update DATABASE_URL in .env.local with new connection string
# 4. Run: pnpm prisma db push
```

## Recommended Action

For **local development and testing OAuth**, I recommend **Option 1**:

1. Use a local PostgreSQL database (port 5433 to avoid conflicts)
2. Keep your Neon database untouched
3. Test OAuth locally first
4. Later, decide how to merge schemas

## Quick Setup (Safe Option)

```bash
# Terminal 1: Start local database
docker run --name briki-oauth-dev \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=briki_dev \
  -p 5433:5432 \
  -d postgres:15

# Terminal 2: Update .env.local
# Open .env.local and change:
# - NEXTAUTH_URL to http://localhost:3000
# - DATABASE_URL to postgresql://postgres:postgres@localhost:5433/briki_dev

# Terminal 2: Setup database
cd briki
pnpm prisma db push

# Terminal 2: Start app
pnpm dev
```

## Current .env.local Changes Needed

You need to update `.env.local` with these changes:

```bash
# Change from http://localhost:3002 to:
NEXTAUTH_URL=http://localhost:3000

# Either keep Neon (and handle migration carefully)
# OR use local database (recommended):
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/briki_dev
```

## Google OAuth Console

Make sure your Google OAuth settings use:
- **Authorized JavaScript origins:** `http://localhost:3000`
- **Authorized redirect URIs:** `http://localhost:3000/api/auth/callback/google`

Remove any `localhost:3002` or `localhost:5050` entries.

---

**Next Step:** Choose your approach above, update `.env.local`, then proceed with testing OAuth.

