# E2E Subscription Tests - Execution Guide

## Overview

This guide provides step-by-step instructions for manually executing E2E subscription scenarios using real Stripe test cards.

## Prerequisites

- ✅ Stripe test mode enabled
- ✅ Webhook endpoint configured: `/api/stripe/webhook`
- ✅ Environment variables configured
- ✅ Test user account created

## Test Cards

Use Stripe test cards:
- ✅ **Success**: `4242 4242 4242 4242`
- ❌ **Decline**: `4000 0000 0000 0002`
- 💳 **Requires Auth**: `4000 0025 0000 3155`

All test cards use: `12/34` as expiry and any 3-digit CVC.

## Scenarios

### SCENARIO 1: New Purchase → Active + correct renewal date

**Steps:**
1. Log in as test user
2. Navigate to `/pricing`
3. Click "Get Started" on Starter plan
4. Complete checkout with card `4242 4242 4242 4242`
5. Return to `/profile?tab=billing`

**Expected Result:**
```
Status: Activo ✅
Next billing: [date in future] ✅
Plan: Starter
```

**Verify:**
```bash
pnpm tsx scripts/e2e-subscription-test.ts <userId>
# Look for "SCENARIO 1: New Purchase" to pass
```

**Capture:**
- Screenshot of profile page showing subscription
- Log output showing `checkout.session.completed` webhook
- Database: subscription row with `status='active'`

---

### SCENARIO 2: Upgrade Mid-Cycle → plan flips; date adjusts

**Steps:**
1. Start with active Starter subscription (from Scenario 1)
2. Navigate to `/profile?tab=billing`
3. Click "Upgrade" on Pro plan
4. Complete checkout with same card
5. Return to profile

**Expected Result:**
```
Plan: Pro ✅
Status: Active ✅
Next billing: [adjusted date reflecting proration]
```

**Verify:**
```bash
# Check database shows Pro plan
# Check that period end reflects prorated billing
pnpm tsx scripts/e2e-subscription-test.ts <userId>
```

**Capture:**
- DB: `planCode='pro'`
- Stripe: subscription.updated event processed
- UI: Shows Pro plan badge

---

### SCENARIO 3: Downgrade at Period End → scheduled change

**Steps:**
1. Start with Pro subscription
2. Navigate to profile
3. Click "Manage Subscription"
4. In Stripe portal, select "Change plan"
5. Select Starter
6. Confirm (will change at period end)

**Expected Result:**
```
Status: Active
Plan: Pro (current)
Scheduled: Will downgrade to Starter on [date]
```

**Verify:**
```bash
# Check database: should have cancelAtPeriodEnd=false initially
# Check Stripe: subscription.update event
pnpm tsx scripts/e2e-subscription-test.ts <userId>
```

**Capture:**
- UI shows "Pro (current)" with downgrade notice
- DB: `cancel_at_period_end` field updated

---

### SCENARIO 4A: Cancel at Period End → "Cancela el <fecha>"

**Steps:**
1. Have active subscription
2. Click "Manage Subscription"
3. In Stripe portal, click "Cancel subscription"
4. Confirm (cancels at period end)
5. Return to profile

**Expected Result (ES):**
```
Cancela el [future date]
```
```
Cancels on [future date]
```

**Verify:**
```bash
# Database: cancelAtPeriodEnd=true, status='active'
# UI: Shows cancellation notice with date
```

---

### SCENARIO 4B: Cancelled → "Sin suscripción"

**Steps:**
1. Wait for subscription to fully cancel (or simulate via Stripe Dashboard)
2. Navigate to profile

**Expected Result:**
```
Sin suscripción
```

**Verify:**
```bash
# Database: no active subscription
# UI: Shows "Sin suscripción" / "No Subscription"
pnpm tsx scripts/e2e-subscription-test.ts <userId>
```

---

### SCENARIO 5: Payment Failure → Past due with retry CTA

**Steps:**
1. Use declined card `4000 0000 0000 0002`
2. Complete checkout
3. Stripe will fail payment
4. Navigate to profile

**Expected Result:**
```
Status: Past Due / Pendiente
Action Button: "Retry Payment" / "Reintentar pago"
```

**Verify:**
```bash
# Database: status='past_due'
# UI: Shows action alert with CTA
pnpm tsx scripts/e2e-subscription-test.ts <userId>
```

**Capture:**
- Screenshot of warning banner
- Stripe: `invoice.payment_failed` webhook received
- DB: subscription updated to `past_due`

---

### SCENARIO 6: Trial → shows trial end date then flips to Active

**Steps:**
1. Create subscription with trial period (if enabled)
2. Complete checkout
3. Navigate to profile

**Expected Result:**
```
Status: Trial / Prueba
Trial ends: [date]
```
After trial:
```
Status: Active / Activo
```

**Verify:**
```bash
# Initially: status='trialing', trialEnd=[date]
# After trial: status='active'
pnpm tsx scripts/e2e-subscription-test.ts <userId>
```

---

## Automated Verification

Run the automated test suite:

```bash
# Test specific user
pnpm tsx scripts/e2e-subscription-test.ts <userId>

# This will:
# 1. Query database for subscription state
# 2. Verify Stripe events match DB
# 3. Check all 6 scenarios
# 4. Generate JSON report
```

## Report Format

The test generates `E2E_TEST_REPORT_[timestamp].json` with:

```json
{
  "requestId": "test-...",
  "timestamp": "2024-...",
  "results": [
    {
      "scenario": "New Purchase",
      "passed": true,
      "details": "...",
      "dbState": { ... },
      "timestamp": "..."
    }
  ],
  "summary": {
    "total": 6,
    "passed": 6,
    "failed": 0
  }
}
```

## Manual Stripe Event Testing

You can also simulate Stripe events using Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Trigger webhook event
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

## Success Criteria

All scenarios pass when:
- ✅ Profile displays correct status text
- ✅ Renewal dates are accurate
- ✅ Database matches Stripe state
- ✅ Webhook events processed successfully
- ✅ UI shows appropriate CTAs
- ✅ Cancellation messages display correctly

## Next Steps

After running all scenarios:

1. **Review logs**: Check webhook processing logs
2. **Verify database**: Confirm all subscriptions synced
3. **Check UI**: Screenshot each scenario state
4. **Document issues**: Note any discrepancies
5. **Submit report**: Share E2E_TEST_REPORT_*.json

