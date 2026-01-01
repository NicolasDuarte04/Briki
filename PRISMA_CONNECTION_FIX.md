# Prisma + Supabase Connection Fix Guide

## Problem Summary

You're experiencing connection issues with Prisma and Supabase where:
- Direct connection (port 5432) connects but immediately drops with `P1017: Server has closed the connection`
- Transaction pooler (port 6543) fails with `P1001: Can't reach database server`
- Tables like `org_members` are missing, preventing the app from running

## Solution 1: Direct SQL Execution (Recommended)

Since Prisma CLI is having connection issues, bypass it entirely:

1. **Open Supabase Dashboard**
   - Go to your project: https://supabase.com/dashboard/project/vkzukorwsllzhpnzdmlo
   - Navigate to **SQL Editor**

2. **Run the Generated Schema**
   - Copy the entire contents of `prisma/generate-schema.sql`
   - Paste and execute in the SQL Editor
   - This will create all missing tables

3. **Verify Tables Created**
   ```sql
   -- Run this to verify
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

## Solution 2: Fix Prisma Connection

### Option A: Enhanced Connection Strings

Update your `.env.local` with timeout parameters:

```bash
# Transaction pooler with extended timeouts
DATABASE_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&pool_timeout=60&connect_timeout=30&statement_timeout=0"

# Direct connection with keep-alive settings
DIRECT_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:5432/postgres?keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=5&connect_timeout=30"
```

### Option B: Use the Wrapper Script

1. **Run the fix script**:
   ```bash
   node fix-prisma-connection.js
   ```

2. **Use the wrapper for Prisma commands**:
   ```bash
   # Instead of: npx prisma db push
   ./prisma-wrapper.sh db push
   ```

### Option C: Environment Variables for Timeouts

Set these before running Prisma:

```bash
export PRISMA_CLIENT_CONNECT_TIMEOUT=30
export PRISMA_QUERY_ENGINE_HTTP_TIMEOUT=30
export PGCONNECT_TIMEOUT=30
export NODE_OPTIONS="--max-old-space-size=4096"

npx prisma db push
```

## Solution 3: Alternative Approaches

### Use Prisma Migrate Deploy (Production-Safe)

1. **Generate migration files**:
   ```bash
   npx prisma migrate dev --create-only --name init
   ```

2. **Apply via SQL Editor**:
   - Find the generated SQL in `prisma/migrations/*/migration.sql`
   - Run it in Supabase SQL Editor

### Use Database Pull Strategy

1. **Create tables directly in Supabase** (using SQL Editor)
2. **Pull the schema to Prisma**:
   ```bash
   npx prisma db pull
   ```

## Troubleshooting Steps

### 1. Test Basic Connection
```bash
node test-prisma-connection.js
```

### 2. Check Supabase Status
- Visit: https://status.supabase.com/
- Check if there are any ongoing issues

### 3. Verify Network
```bash
# Test direct connection
nc -zv aws-1-us-east-2.pooler.supabase.com 5432

# Test pooler connection  
nc -zv aws-1-us-east-2.pooler.supabase.com 6543
```

### 4. Try Different Regions
If you're far from US East, latency might cause timeouts. Consider:
- Using a VPN closer to the region
- Requesting Supabase to migrate your project

## Common Issues and Solutions

### P1017: Server has closed the connection
- **Cause**: Connection timeout or proxy dropping long-running connections
- **Fix**: Use SQL Editor or add keep-alive parameters

### P1001: Can't reach database server
- **Cause**: Connection pooler issues or network restrictions
- **Fix**: Try direct connection or check firewall settings

### Missing Tables
- **Cause**: Schema not synchronized
- **Fix**: Run the SQL script directly in Supabase

## Quick Recovery Steps

1. **Immediate Fix**:
   ```bash
   # Go to Supabase SQL Editor and run:
   cat prisma/generate-schema.sql
   ```

2. **Verify**:
   ```bash
   pnpm dev
   # Should now work without "org_members" errors
   ```

3. **Future Changes**:
   - Make schema changes in Prisma schema
   - Generate SQL: `npx prisma migrate diff`
   - Apply via Supabase SQL Editor

## Prevention

For future schema changes:

1. **Development**: Use Prisma migrations locally
2. **Production**: 
   - Generate SQL from migrations
   - Review the SQL
   - Apply via Supabase SQL Editor
   - Run `prisma db pull` to sync

This approach avoids connection timeout issues entirely.
