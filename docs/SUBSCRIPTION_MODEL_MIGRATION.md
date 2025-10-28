# Subscription Model Migration

## Overview
This document describes the Subscription data model and migration process for persisting Stripe subscription data.

## Data Model

### Schema Diagram
```
Profile (1) ────── (n) Subscription
  │
  ├─ id: UUID (primary key)
  ├─ stripe_customer_id: VARCHAR(255) (nullable)
  └─ ... (other profile fields)

Subscription
  ├─ id: UUID (primary key)
  ├─ user_id: UUID → profiles.id (FK, cascade delete)
  ├─ stripe_customer_id: VARCHAR(255)
  ├─ stripe_subscription_id: VARCHAR(255) UNIQUE
  ├─ stripe_price_id: VARCHAR(255)
  ├─ stripe_product_id: VARCHAR(255)
  ├─ plan_code: VARCHAR(50)
  ├─ status: VARCHAR(50)
  ├─ interval: VARCHAR(20) (month/year)
  ├─ currency: VARCHAR(3)
  ├─ current_period_start: TIMESTAMPTZ
  ├─ current_period_end: TIMESTAMPTZ
  ├─ cancel_at_period_end: BOOLEAN
  ├─ trial_end: TIMESTAMPTZ (nullable)
  ├─ cancel_at: TIMESTAMPTZ (nullable)
  ├─ canceled_at: TIMESTAMPTZ (nullable)
  ├─ created_at: TIMESTAMPTZ
  └─ updated_at: TIMESTAMPTZ
```

## Migration Files

### 1. Prisma Schema
File: `prisma/schema.prisma`

Added:
- `stripeCustomerId` field to `Profile` model
- `Subscription` model with all required Stripe fields

### 2. SQL Migration
File: `supabase/migrations/20250120_add_subscription_model.sql`

Contains:
- ALTER TABLE to add `stripe_customer_id` to profiles
- CREATE TABLE for subscriptions
- Indexes for performance
- RLS policies for security

## Applying the Migration

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20250120_add_subscription_model.sql`
4. Paste into the SQL editor and click **RUN**

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Apply the migration
supabase db push

# Or apply a specific migration file
supabase db execute -f supabase/migrations/20250120_add_subscription_model.sql
```

### Option 3: Using psql (Local Development)

```bash
# From project root
psql your-database-url -f supabase/migrations/20250120_add_subscription_model.sql
```

## Post-Migration Steps

### 1. Update Prisma Client
After applying the migration, regenerate Prisma client:

```bash
npx prisma generate
```

### 2. Verify Migration
Check that the table exists and has correct structure:

```sql
-- Check table exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subscriptions'
ORDER BY ordinal_position;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'subscriptions';
```

### 3. Test Data Access
Verify you can query the subscription data:

```typescript
// Example query using Prisma
const subscription = await prisma.subscription.findUnique({
  where: { stripeSubscriptionId: 'sub_xxx' },
  include: { profile: true }
});
```

## Integration Points

### 1. Checkout Flow
Update `src/app/api/stripe/checkout/route.ts` to:
- Store Stripe customer ID in Profile
- Create/update Subscription record after successful checkout

### 2. Webhook Handler
Update `src/app/api/stripe/webhook/route.ts` to:
- Handle `checkout.session.completed` → Create Subscription
- Handle `customer.subscription.updated` → Update Subscription
- Handle `customer.subscription.deleted` → Mark as canceled
- Handle `invoice.payment_failed` → Update status

### 3. Profile/Account Page
Update `src/app/[locale]/(app)/profile/PlanManagement.tsx` to:
- Query actual subscription from database
- Display real plan status instead of hardcoded "free"
- Show actual billing information

## Security Notes

### Row Level Security (RLS)
The migration includes RLS policies that:
- Allow users to view only their own subscriptions
- Allow system/webhook to insert/update subscriptions
- Prevent unauthorized access to subscription data

### Data Protection
- `stripe_subscription_id` is unique to prevent duplicates
- CASCADE delete removes subscriptions when user is deleted
- Foreign key constraints ensure data integrity

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Drop subscriptions table
DROP TABLE IF EXISTS public.subscriptions;

-- Remove stripe_customer_id from profiles
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS stripe_customer_id;
```

## Success Criteria

✅ Migration applied without errors  
✅ `subscriptions` table exists in public schema  
✅ `profiles.stripe_customer_id` column exists  
✅ Indexes are created  
✅ RLS policies are active  
✅ Prisma client regenerated  
✅ Can query subscription data via Prisma  

## Next Steps

1. Update webhook handler to persist subscription data
2. Update checkout flow to link customer to profile
3. Update UI to show real subscription status
4. Add subscription management endpoints
5. Test end-to-end subscription flow

