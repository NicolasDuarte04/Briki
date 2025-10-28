# E2E Subscription Test - Execution Summary

## Quick Start

### 1. Run Automated Verification

```bash
# Get your test user ID first
# Then run:
pnpm tsx scripts/e2e-subscription-test.ts <userId>
```

### 2. Manual Testing

Follow the guide in `docs/E2E_SUBSCRIPTION_TEST_GUIDE.md` to execute each scenario manually.

## Scenarios Checklist

- [ ] **Scenario 1**: New Purchase → Activo + correct next renewal date
- [ ] **Scenario 2**: Upgrade mid-cycle → plan flips; date adjusts
- [ ] **Scenario 3**: Downgrade at period end → shows scheduled change
- [ ] **Scenario 4a**: Cancel at period end → "Cancela el <fecha>"
- [ ] **Scenario 4b**: After cancel → "Sin suscripción"
- [ ] **Scenario 5**: Payment failure → Past due with retry CTA
- [ ] **Scenario 6**: Trial → shows trial end date then flips to Active

## Helper Commands

```bash
# Check subscription state
pnpm tsx scripts/e2e-subscription-helper.ts state <userId>

# Simulate webhook event
pnpm tsx scripts/e2e-subscription-helper.ts simulate checkout.session.completed <subId>

# Print detailed info
pnpm tsx scripts/e2e-subscription-helper.ts info <userId>

# Clean up test data (CAUTION!)
pnpm tsx scripts/e2e-subscription-helper.ts cleanup <userId>
```

## What to Capture

For each scenario, capture:

1. **UI Screenshot** - The profile page showing subscription state
2. **Log Output** - Console logs from webhook processing
3. **Database State** - Run helper commands to verify DB
4. **Stripe Dashboard** - Subscription status in Stripe

## Expected Profile Strings

| Scenario | Spanish | English |
|----------|---------|---------|
| Active | "Activo" | "Active" |
| Trial | "Prueba" | "Trial" |
| Past Due | "Pendiente" | "Past Due" |
| Cancel Scheduled | "Cancela el [date]" | "Cancels on [date]" |
| No Subscription | "Sin suscripción" | "No Subscription" |

## Test Cards

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline |
| 4000 0025 0000 3155 | Requires Auth |

Expiry: `12/34`, CVC: any 3 digits

## Success Criteria

✅ All scenarios work with:
- Existing Checkout flow
- Portal flow for management
- Webhook sync from Stripe
- Database reconciliation
- UI displays correct strings
- No manual DB tweaks needed

## Files Created

1. `scripts/e2e-subscription-test.ts` - Automated test runner
2. `scripts/e2e-subscription-helper.ts` - Helper utilities
3. `docs/E2E_SUBSCRIPTION_TEST_GUIDE.md` - Detailed execution guide
4. `E2E_SUBSCRIPTION_EXECUTION_SUMMARY.md` - This file

## Report Output

After running tests, you'll get:
- `E2E_TEST_REPORT_[timestamp].json` - Detailed results
- Console output showing pass/fail for each scenario
- Step-by-step verification

## Next Steps

1. Execute each scenario manually
2. Run automated verification after each scenario
3. Document any discrepancies
4. Share results with team

---

**Note**: This is an execution-only task. No code edits required. Use existing flows.

