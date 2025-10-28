# Subscription Checkout Flow

This document describes the complete flow for creating and managing subscriptions in Briki, from checkout to database persistence.

## Overview

The subscription creation flow ensures that:
1. Users are properly linked to Stripe customers
2. Subscription data is synchronized between Stripe and the database
3. The database always has up-to-date subscription information

## Architecture

### Components

1. **Checkout API Route** (`src/app/api/stripe/checkout/route.ts`)
   - Creates checkout sessions
   - Creates and links Stripe customers to users
   - Includes metadata for reconciliation

2. **Webhook Handler** (`src/app/api/stripe/webhook/route.ts`)
   - Processes Stripe webhook events
   - Syncs subscription data to database
   - Handles subscription lifecycle events

3. **Subscription Utilities** (`src/lib/subscription.ts`)
   - Helper functions for subscription management
   - Database operations for subscriptions
   - Stripe API integration

### Database Model

The subscription is stored in the `Subscription` table with the following key fields:

```prisma
model Subscription {
  id                    String    @id
  userId                String
  stripeCustomerId      String
  stripeSubscriptionId  String    @unique
  stripePriceId         String
  stripeProductId       String
  planCode              String
  status                String
  interval              String
  currency              String
  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime
  cancelAtPeriodEnd     Boolean
  trialEnd              DateTime?
  // ... timestamps
}
```

## Flow Details

### 1. Checkout Initiation

**Client** → `POST /api/stripe/checkout`

**Request:**
```json
{
  "planId": "pro",
  "isAnnual": false,
  "userId": "user-uuid",
  "userEmail": "user@example.com"
}
```

**Checkout Route Processing:**
1. Validates plan ID and billing interval
2. Retrieves or creates Stripe customer:
   - Checks profile for existing `stripeCustomerId`
   - If missing, creates new customer with metadata:
     - `user_id`: The user's ID
     - `plan_id`: The plan being purchased
   - Updates profile with customer ID
3. Creates checkout session:
   - Links to customer if available
   - Includes metadata: `userId`, `planId`, `isAnnual`
   - Sets success/cancel URLs

**Response:**
```json
{
  "ok": true,
  "sessionUrl": "https://checkout.stripe.com/..."
}
```

### 2. User Completes Checkout

User is redirected to Stripe Checkout, completes payment, and is redirected back to the success URL.

### 3. Webhook Processing

Stripe sends webhook events to `/api/stripe/webhook`.

#### Event: `checkout.session.completed`

**What happens:**
1. Extracts `userId` from session metadata
2. Links customer to user profile if not already linked
3. Retrieves subscription from Stripe
4. Creates or updates subscription record in database

**Database Updates:**
- Creates `Subscription` record with complete Stripe data
- Links `stripeCustomerId` to profile
- Sets status to match Stripe status (usually `active` or `trialing`)

#### Event: `customer.subscription.updated`

**What happens:**
1. Extracts user ID from customer metadata
2. Syncs full subscription data from Stripe
3. Updates existing subscription record

**Database Updates:**
- Updates `status`, `currentPeriodStart`, `currentPeriodEnd`
- Updates cancellation flags if applicable

#### Event: `customer.subscription.deleted`

**What happens:**
1. Updates subscription status to `canceled`
2. Sets `canceledAt` timestamp

#### Event: `invoice.payment_failed`

**What happens:**
1. Marks subscription as `past_due`
2. Database retains subscription record for recovery attempts

### 4. Database Reconciliation

#### Customer Linking

The flow ensures users are always linked to Stripe customers:

```typescript
// In checkout route
profile → stripeCustomerId → Stripe Customer

// In webhook
session.metadata.userId → Profile → stripeCustomerId
customer.metadata.user_id → Profile lookup
```

#### Subscription Sync

The `syncSubscriptionFromStripe` function:
1. Retrieves full subscription from Stripe
2. Extracts price, product, and plan information
3. Determines plan code from metadata or product name
4. Creates or updates database record

**Idempotency:** If a subscription already exists, it's updated rather than duplicated.

## Helper Functions

### `updateProfileWithCustomerId(userId, customerId)`

Updates the profile's `stripeCustomerId` field. Used in both checkout and webhook flows.

### `syncSubscriptionFromStripe(stripe, subscriptionId, userId)`

Retrieves subscription from Stripe and creates/updates database record. Extracts:
- Price ID and product ID
- Plan code (from metadata or product)
- Status and timestamps
- Cancellation flags

### `createOrUpdateSubscription(input)`

Low-level function for database operations. Handles both create and update cases.

### `getActiveSubscription(userId)`

Retrieves active subscription for a user (status: `active` or `trialing`).

## Success Criteria

After a successful checkout:
1. ✅ User profile has `stripeCustomerId` set
2. ✅ Subscription record exists in database
3. ✅ Subscription status matches Stripe
4. ✅ Current period dates are correct
5. ✅ Plan information is accurate

## Error Handling

### Checkout Errors
- Missing plan ID → 400 Bad Request
- Invalid price configuration → 400 Bad Request
- Stripe API errors → 500 with error message

### Webhook Errors
- Invalid signature → 400 Bad Request
- Missing userId → Logged and skipped
- Database errors → Logged, webhook still returns 200

**Note:** Webhooks return 200 even on processing errors to prevent retries. Errors are logged for manual investigation.

## Metadata Requirements

### Checkout Session Metadata
```typescript
{
  userId: string;      // User UUID
  planId: string;      // Plan identifier (starter, pro, etc.)
  isAnnual: 'true'|'false';
  created_by: 'checkout_api';
}
```

### Stripe Customer Metadata
```typescript
{
  user_id: string;     // User UUID
  plan_id: string;     // Current plan
}
```

## Testing

### Test Checkout Flow
1. Create test user
2. Call checkout API with valid plan
3. Complete Stripe checkout (test card)
4. Verify webhook is received
5. Check database for:
   - Profile has `stripeCustomerId`
   - Subscription record exists
   - Status is correct

### Test Subscription Updates
1. Update subscription in Stripe dashboard
2. Verify webhook is received
3. Check database is updated

## Monitoring

Key logs to monitor:
- `[Checkout] Created and linked Stripe customer`
- `[Webhook] Payment successful`
- `[Webhook] Synced subscription`
- `[Webhook] Error processing` (investigate if frequent)

## Future Enhancements

1. Email notifications on subscription events
2. Usage tracking and limits enforcement
3. Subscription analytics and reporting
4. Automatic retry logic for failed payments
5. Proration handling for upgrades/downgrades

