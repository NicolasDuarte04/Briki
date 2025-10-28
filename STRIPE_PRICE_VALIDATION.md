# Stripe Price Validation

This document outlines the Stripe price validation system to prevent silent misconfigurations.

## Overview

The system provides two layers of protection:

1. **Runtime Warnings**: Server startup warnings that detect missing price IDs for UI-visible plans
2. **Developer Utility**: Script to validate Stripe prices and display their configuration

## Features

### 1. Startup Warnings (`src/lib/env.ts`)

When the server starts, it automatically checks if all plans displayed in the pricing UI have corresponding Stripe price IDs configured.

**What it checks:**
- Plans: Starter, Pro, Team (Enterprise is excluded as it uses contact flow)
- Intervals: Monthly and Yearly for each plan
- Environment variables: `STRIPE_{PLAN}_{INTERVAL}_PRICE_ID`

**Behavior:**
- Non-fatal warnings (does not crash the app)
- Lists all missing configurations on startup
- Helps catch misconfigurations before users click

**Example output:**
```
⚠️  Stripe Price Configuration Warning:
The following plans/intervals displayed in the pricing UI lack configured price IDs:
  - Starter (monthly)
  - Pro (yearly)
Set the corresponding STRIPE_*_PRICE_ID environment variables.
Users clicking these plans will receive an error.
```

### 2. Developer Validation Script (`scripts/stripe-price-check.ts`)

A comprehensive utility that validates all configured Stripe prices and displays their attributes.

**Usage:**
```bash
pnpm stripe:check
```

**What it does:**
1. Reads all configured `STRIPE_*_PRICE_ID` environment variables
2. Fetches each price from Stripe API
3. Displays a table with key attributes:
   - Plan name and interval
   - Active status
   - Type (recurring/one-time)
   - Billing interval details
   - Currency and amount
   - Issues/failures

**Example output:**
```
🔍 Stripe Price Configuration Check (TEST MODE)
================================================================================

📊 Price Configuration Status:
--------------------------------------------------------------------------------
  Plan         Interval   Status   Type       Interval   Amount       Issues               
--------------------------------------------------------------------------------
  Starter      Monthly    ✓ Active Recurring  month/1    USD 49.00    OK                   
  Starter      Yearly     ✓ Active Recurring  year/1     USD 470.00   OK                   
  Pro          Monthly    ✓ Active Recurring  month/1    USD 149.00   OK                   
  Pro          Yearly     ✗ Inactive Recurring year/1     USD 1430.00  Inactive!            

--------------------------------------------------------------------------------

⚠️  Found 1 issue(s) to address.

📝 Summary:
────────────────────────────────────────────────────────────────────────────────
  Active Recurring: 6
  Inactive: 1
  Missing Config: 0
  Invalid IDs: 0

💡 Recommendations:
  1. All prices should be active and recurring for subscription mode
  2. Ensure test mode keys point to test prices and live keys to live prices
  3. Verify each STRIPE_*_PRICE_ID in your .env matches a price in Stripe Dashboard
  4. Enterprise prices are optional (sales-driven plans)
```

**Safety:**
- Never prints secret keys or tokens
- Only prints partial IDs (already in environment variables)
- Detects test vs live mode from key prefix
- Provides clear recommendations

## Environment Variables

Configure the following in your `.env.local`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Test or live key
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs
STRIPE_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_STARTER_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_TEAM_MONTHLY_PRICE_ID=price_...
STRIPE_TEAM_YEARLY_PRICE_ID=price_...
```

**Note:** Enterprise prices are optional (uses email contact flow).

## Stripe Dashboard Setup

1. **Create Products**: One for each plan (Starter, Pro, Team)
2. **Create Prices**: 
   - Monthly recurring price for each product
   - Yearly recurring price for each product
3. **Verify Settings**:
   - Price must be **Active**
   - Type must be **Recurring**
   - Correct currency (USD)
   - Correct interval (month/year)
   - Same environment as your API key (test/live)
4. **Copy Price IDs**: Copy `price_...` IDs to your environment variables

## Quick Reference

```bash
# Check environment variables are set
pnpm check:env

# Validate Stripe price configuration
pnpm stripe:check

# Start dev server (will show warnings if misconfigured)
pnpm dev
```

## Error Handling

The checkout API (`src/app/api/stripe/checkout/route.ts`) validates:

1. ✅ Price ID is configured
2. ✅ Price exists in Stripe
3. ✅ Price is active
4. ✅ Price is recurring (not one-time)

If any check fails, returns appropriate HTTP status and error message.

